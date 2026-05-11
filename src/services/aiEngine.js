const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

const PROMPT_TEMPLATE = (codeStructure) => `
You are a senior software engineer. Please analyze this codebase and explain what it does.

Here is the structure and code of the repository:
${JSON.stringify(codeStructure, null, 2)}

You MUST return your answer strictly as a JSON object matching this exact format:
{
    "summary": "A high-level summary of what the application does.",
    "entryPoint": "Explanation of the main entry point and how it bootstraps the app.",
    "architecture": "A brief explanation of the design patterns or file structure used."
}
`;

// --- Primary: Gemini ---
async function generateWithGemini(codeStructure, retries = 3) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: PROMPT_TEMPLATE(codeStructure),
            config: { responseMimeType: "application/json" }
        });
        console.log('✅ Gemini responded successfully.');
        return JSON.parse(response.text);
    } catch (error) {
        if (retries > 0) {
            const waitTime = (4 - retries) * 3000; // 3s, 6s, 9s backoff
            console.log(`\n⚠️  Gemini failed (${error.status ?? error.message}). Retrying in ${waitTime / 1000}s... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return generateWithGemini(codeStructure, retries - 1);
        }
        // All retries exhausted — bubble up so we can try OpenAI
        throw error;
    }
}

// --- Fallback: OpenAI ---
async function generateWithOpenAI(codeStructure) {
    console.log('🔄 Falling back to OpenAI (gpt-4o-mini)...');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: PROMPT_TEMPLATE(codeStructure)
            }
        ],
        response_format: { type: 'json_object' }
    });

    console.log('✅ OpenAI responded successfully.');
    return JSON.parse(response.choices[0].message.content);
}

// --- Orchestrator: try Gemini first, fall back to OpenAI ---
async function generateExplanation(codeStructure) {
    // Attempt Gemini first
    if (process.env.GEMINI_API_KEY) {
        try {
            return await generateWithGemini(codeStructure);
        } catch (geminiError) {
            console.error('❌ Gemini exhausted all retries:', geminiError.message ?? geminiError);
        }
    } else {
        console.warn('⚠️  GEMINI_API_KEY not set, skipping Gemini.');
    }

    // Fall back to OpenAI
    if (process.env.OPENAI_API_KEY) {
        try {
            return await generateWithOpenAI(codeStructure);
        } catch (openaiError) {
            console.error('❌ OpenAI also failed:', openaiError.message ?? openaiError);
        }
    } else {
        console.warn('⚠️  OPENAI_API_KEY not set, cannot fall back to OpenAI.');
    }

    // Both failed — return a safe error object so the rest of the app doesn't break
    return {
        summary: 'Failed to generate explanation. Both Gemini and OpenAI are unavailable.',
        entryPoint: 'N/A',
        architecture: 'N/A'
    };
}

module.exports = {
    generateExplanation
};
