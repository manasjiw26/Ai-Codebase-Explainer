const { cloneRepository, cleanupRepository } = require('../services/repoClone');
const { traverseDirectory } = require('../services/fileTraverser');
const { isValidURL } = require('../utils/URL_Validation');
const { parseCode, extractImports, extractFunctions } = require('../services/codeParser');
const { buildDependencyGraph } = require('../services/dependencyGraph');
const { selectImportantFiles } = require('../services/filePrioritizer');
const { buildRepositoryContext } = require('../services/contextBuilder');
const { generateExplanation, generateChatReply } = require('../services/aiEngine');
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

        const analysisRecord = await Analysis.create({
            repoUrl: repoUrl,
            status: 'queued',
            progress: 10
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
            await Analysis.findByIdAndUpdate(analysisRecord._id, { status: 'running', progress: 20 });
            console.log('\n📂 Directory traversal complete.');
            console.log(`   Found ${stats.fileContents.length} files to process.\n`);

            const prioritizedFiles = selectImportantFiles(stats.fileContents, 30);
            await Analysis.findByIdAndUpdate(analysisRecord._id, { progress: 40 });

            prioritizedFiles.forEach(file => {
                const ast = parseCode(file.content, file.path);
                if (ast) {
                    file.imports = extractImports(ast);
                    file.functions = extractFunctions(ast);
                    console.log(`📄 Parsed:   ${file.path}`);
                } else if (file.path) {
                    console.log(`⏭️  Skipped:  ${file.path} (non-JS file)`);
                }
            });

            const dependencyGraph = buildDependencyGraph(prioritizedFiles);
            await Analysis.findByIdAndUpdate(analysisRecord._id, { progress: 70 });
            console.log('\n🔗 Dependency graph built.');

            const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let i = 0;
            const spinner = setInterval(() => {
                process.stdout.write(`\r${frames[i++ % frames.length]} Sending code to AI for analysis...`);
            }, 80);

            let explanation;
            try {
                const repositoryContext = buildRepositoryContext(prioritizedFiles);
                explanation = await generateExplanation({
                    files: prioritizedFiles,
                    architecture: dependencyGraph,
                    context: repositoryContext
                });
            } catch (aiErr) {
                clearInterval(spinner);
                process.stdout.write('\r\x1b[K');
                console.error('❌ AI generation failed:', aiErr.message ?? aiErr);
                await Analysis.findByIdAndUpdate(analysisRecord._id, { status: 'failed', errorMessage: aiErr.message ?? 'AI request failed', progress: 100 });
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
                    progress: 100,
                    summary: explanation.summary,
                    entryPoint: explanation.entryPoint,
                    architecture: explanation.architecture,
                    errorMessage: null
                });
                console.log(`✅ DB record updated. Analysis ID: ${analysisRecord._id}`);
            } catch (dbErr) {
                console.error('❌ Failed to update database:', dbErr.message);
            }

        }).catch(async err => {
            console.error('❌ Error during analysis pipeline:', err);
            await Analysis.findByIdAndUpdate(analysisRecord._id, { status: 'failed', errorMessage: err.message ?? 'Analysis failed', progress: 100 });
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

const chatWithAnalysis = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'message is required' });
        }

        const analysis = await Analysis.findById(id);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        if (analysis.status !== 'completed') {
            return res.status(409).json({ error: 'Analysis is still in progress. Please wait until it completes.' });
        }

        const reply = await generateChatReply({
            repoUrl: analysis.repoUrl,
            summary: analysis.summary || 'No summary available yet.',
            entryPoint: analysis.entryPoint || 'No entry point available yet.',
            architecture: analysis.architecture || 'No architecture summary available yet.'
        }, message);

        res.status(200).json({ reply });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    startAnalysis,
    getAnalysisStatus,
    deleteAnalysis,
    chatWithAnalysis
};
