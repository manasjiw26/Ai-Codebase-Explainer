const { cloneRepository, cleanupRepository } = require('../services/repoClone');
const { traverseDirectory } = require('../services/fileTraverser');
const { isValidURL } = require('../utils/URL_Validation');
const { parseCode, extractImports, extractFunctions } = require('../services/codeParser');
const { buildDependencyGraph } = require('../services/dependencyGraph');
const { generateExplanation } = require('../services/aiEngine');
const Analysis = require('../models/Analysis');

const startAnalysis = async (req, res, next) => {
    try {
        console.log('\n========== REQUEST RECEIVED ==========');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('=======================================\n');

        const { repoUrl } = req.body;

        if (!repoUrl) {
            console.log('❌ repoUrl is missing');
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

        console.log(`✅ Analysis started for: ${repoUrl}`);
        console.log(`📊 Analysis ID: ${analysisRecord._id}\n`);

        res.status(202).json({
            message: 'Analysis started',
            analysisId: analysisRecord._id, // Return this ID to the user!
            repoUrl
        });

        traverseDirectory(targetDir).then(async stats => {
            console.log('\n📂 Directory traversal complete.');
            console.log(`   Found ${stats.fileContents.length} files to process.\n`);

            stats.fileContents.forEach(file => {
                const ast = parseCode(file.content, file.path);
                if (ast) {
                    file.imports = extractImports(ast);
                    file.functions = extractFunctions(ast);
                    console.log(`📄 Parsed:   ${file.path}`);
                } else if (file.path) {
                    console.log(`⏭️  Skipped:  ${file.path} (non-JS file)`);
                }
            });

            const dependencyGraph = buildDependencyGraph(stats.fileContents);
            console.log('\n🔗 Dependency graph built.');

            // Spinner while waiting for AI
            const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let i = 0;
            const spinner = setInterval(() => {
                process.stdout.write(`\r${frames[i++ % frames.length]} Sending code to AI for analysis...`);
            }, 80);

            let explanation;
            try {
                explanation = await generateExplanation({
                    files: stats.fileContents,
                    architecture: dependencyGraph
                });
            } catch (aiErr) {
                clearInterval(spinner);
                process.stdout.write('\r\x1b[K');
                console.error('❌ AI generation failed:', aiErr.message ?? aiErr);
                await Analysis.findByIdAndUpdate(analysisRecord._id, { status: 'failed' });
                return;
            }

            clearInterval(spinner);
            process.stdout.write('\r\x1b[K');
            console.log("================ AI EXPLANATION ================\n");
            console.log(explanation);
            console.log("\n================================================");

            try {
                await Analysis.findByIdAndUpdate(analysisRecord._id, {
                    status: 'completed',
                    summary: explanation.summary,
                    entryPoint: explanation.entryPoint,
                    architecture: explanation.architecture
                });
                console.log(`✅ DB record updated. Analysis ID: ${analysisRecord._id}`);
            } catch (dbErr) {
                console.error('❌ Failed to update database:', dbErr.message);
            }

        }).catch(async err => {
            console.error('❌ Error during analysis pipeline:', err);
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
