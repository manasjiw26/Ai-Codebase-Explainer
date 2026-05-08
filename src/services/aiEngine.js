const { GoogleGenAI } = require('@google/genai');

// We will use the new Google Gen AI SDK
// The Gemini 2.5 Flash model is extremely fast and completely FREE to use under the free tier limits!

async function generateExplanation(codeStructure, retries = 1) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
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

        // By setting responseMimeType to 'application/json', we force Gemini to only output valid JSON
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        // The response is now a guaranteed JSON string, so we can safely parse it into a Javascript Object
        return JSON.parse(response.text);
    } catch (error) {
        if (retries > 0) {
            console.log("\n⚠️ AI API overloaded. Retrying one more time in 2 seconds...");
            // Wait for 2 seconds before trying again
            await new Promise(resolve => setTimeout(resolve, 2000));
            return generateExplanation(codeStructure, retries - 1);
        }
        console.error("AI Generation Error:", error);
        // Return a JSON object so our app doesn't break expecting JSON!
        return { summary: "Failed to generate explanation from AI after retries." };
    }
}

module.exports = {
    generateExplanation
};
