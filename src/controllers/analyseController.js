const { cloneRepository, cleanupRepository } = require('../services/repoClone');
const { traverseDirectory } = require('../services/fileTraverser');
const { isValidURL } = require('../utils/URL_Validation');
const { parseCode, extractImports, extractFunctions } = require('../services/codeParser');
const { buildDependencyGraph } = require('../services/dependencyGraph');
const { generateExplanation } = require('../services/aiEngine');
const Analysis = require('../models/Analysis');

const startAnalysis = async (req, res, next) => {
    try {
        const { repoUrl } = req.body;

        if (!repoUrl) {
            return res.status(400).json({ error: 'repoUrl is required' });
        }

        if (!isValidURL(repoUrl)) {
            return res.status(400).json({ error: 'Invalid GitHub repository URL' });
        }

        // --- NEW: Create a "pending" record in the database FIRST ---
        const analysisRecord = await Analysis.create({
            repoUrl: repoUrl,
            status: 'pending'
        });

        // Trigger cloning in the background
        const targetDir = await cloneRepository(repoUrl);

        res.status(202).json({
            message: 'Analysis started',
            analysisId: analysisRecord._id, // Return this ID to the user!
            repoUrl
        });

        traverseDirectory(targetDir).then(stats => {
            console.log('Analysis complete:', stats);
            stats.fileContents.forEach(file => {
                const ast = parseCode(file.content);
                if (ast) {
                    file.imports = extractImports(ast);
                    file.functions = extractFunctions(ast);

                    console.log(`\n📄 File: ${file.path}`);
                    console.log(`Imports found:`, file.imports);
                    console.log(`Functions found:`, file.functions);
                }
            });

            // --- NEW: Build and print the graph! ---
            const dependencyGraph = buildDependencyGraph(stats.fileContents);

            // --- NEW: Send everything to Gemini! ---
            const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let i = 0;
            const spinner = setInterval(() => {
                process.stdout.write(`\r${frames[i++ % frames.length]} Sending code to Gemini for analysis...`);
            }, 80);

            generateExplanation({
                files: stats.fileContents,
                architecture: dependencyGraph
            }).then(async explanation => {
                clearInterval(spinner);
                process.stdout.write('\r\x1b[K'); // Clears the buffering line
                console.log("================ AI EXPLANATION ================\n");
                console.log(explanation);
                console.log("\n================================================");
                
                // --- NEW: Update the pending DB record ---
                try {
                    await Analysis.findByIdAndUpdate(analysisRecord._id, {
                        status: 'completed',
                        summary: explanation.summary,
                        entryPoint: explanation.entryPoint,
                        architecture: explanation.architecture
                    });
                    console.log(`✅ Updated Database Record ID: ${analysisRecord._id}`);
                } catch (dbErr) {
                    console.error("Failed to update database:", dbErr.message);
                }
                // -----------------------
            });

        }).catch(async err => {
            console.error('Error during analysis:', err);
            await Analysis.findByIdAndUpdate(analysisRecord._id, { status: 'failed' });
        }).finally(() => {
            cleanupRepository(targetDir);
        });

        // cleanupRepository(targetDir);
    } catch (err) {
        next(err);
    }
};

const getAnalysisStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const analysis = await Analysis.findById(id);
        
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        res.status(200).json(analysis);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analysis status' });
    }
};

const deleteAnalysis = (req, res) => {
    const { id } = req.params;
    res.status(200).json({ status: 'Analysis cancelled', id });
};

module.exports = {
    startAnalysis,
    getAnalysisStatus,
    deleteAnalysis
};
