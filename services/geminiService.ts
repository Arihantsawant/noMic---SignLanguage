import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Refines a sequence of raw signs/glosses into a coherent English sentence.
 */
export const refineSentence = async (rawText: string): Promise<string> => {
  if (!rawText || rawText.trim().length === 0) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a sign language interpretation assistant. 
      Convert the following sequence of sign glosses into a natural, grammatically correct English sentence.
      Preserve the meaning. Do not add introductory text. Just the sentence.
      
      Input: "${rawText}"
      `,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return rawText;
  }
};

/**
 * Predicts the intended word based on partial character inputs.
 */
export const getWordSuggestions = async (partialText: string): Promise<string[]> => {
    if (!partialText || partialText.length < 1) return [];
    
    // Get the last unfinished word
    const words = partialText.trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    
    if (!lastWord || lastWord.length < 1) return [];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Predict 3 likely English words that start with or are similar to the letters: "${lastWord}". 
            Context: The user is using a sign language capture system.
            Return ONLY a JSON array of 3 strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        
        const suggestions = JSON.parse(response.text);
        return Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
    } catch (e) {
        console.error("Suggestion Error:", e);
        return [];
    }
}
