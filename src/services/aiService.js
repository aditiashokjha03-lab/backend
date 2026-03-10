const ai = require('../config/gemini');

async function suggestHabits(goalCategory, goalDescription) {
    const systemPrompt = `You are HabiTAI, a world-class habit coach.
Given a user's goal, return EXACTLY 2-3 habits as a JSON array.
Each item: { "name": string, "description": string, "frequency": string, "difficulty": string, "why": string }
difficulty: easy|medium|hard|expert
frequency: daily|weekdays|weekends|3x_week|weekly
Be specific, actionable, science-backed.
Return ONLY the JSON array. No markdown fences, no preamble.`;

    const userMsg = `Goal category: ${goalCategory}\nMy goal: ${goalDescription}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMsg,
            config: {
                systemInstruction: systemPrompt,
                responseModalities: ["TEXT"],
                responseMimeType: "application/json"
            }
        });

        const raw = response.text.trim();
        // Sometimes LLMs still add markdown even with JSON mimeType preference, try to clean it
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}

module.exports = { suggestHabits };
