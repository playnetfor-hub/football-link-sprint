import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Challenge, EntityType, Difficulty } from "../types";

// CRITICAL: The API key must be set in the environment variables (process.env.API_KEY).
// Do NOT hardcode the key here directly, or it will cause ReferenceErrors and security leaks.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We define a primary model and a fallback model to handle rate limits (429)
// If the main model is exhausted, we switch to the Lite version.
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-flash-lite-latest";

// Schema for generating a challenge
const challengeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    cardA: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the first entity (Team, Player, Coach, etc) in Arabic" },
        type: { type: Type.STRING, description: "Type of entity: TEAM, PLAYER, COACH, TROPHY, NATIONAL_TEAM" },
        imageUrl: { type: Type.STRING, description: "REQUIRED. A valid HTTPS URL for a logo, face, or trophy from Wikimedia Commons. MUST BE an image file (jpg/png)." },
        color: { type: Type.STRING, description: "Primary hex color associated with this entity (e.g. #FFFFFF for Real Madrid, #BD0000 for Bayern)." }
      },
      required: ["name", "type", "imageUrl"]
    },
    cardB: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Name of the second entity in Arabic" },
        type: { type: Type.STRING, description: "Type of entity: TEAM, PLAYER, COACH, TROPHY, NATIONAL_TEAM" },
        imageUrl: { type: Type.STRING, description: "REQUIRED. A valid HTTPS URL for a logo, face, or trophy from Wikimedia Commons. MUST BE an image file (jpg/png)." },
        color: { type: Type.STRING, description: "Primary hex color associated with this entity." }
      },
      required: ["name", "type", "imageUrl"]
    },
    possibleSolutions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 2-3 players who satisfy the connection, for internal validation reference."
    }
  },
  required: ["cardA", "cardB", "possibleSolutions"]
};

// Schema for validating an answer
const validationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    reason: { type: Type.STRING, description: "Brief explanation in Arabic why it is correct or incorrect." },
    correctAnswer: { type: Type.STRING, description: "If incorrect, provide one correct player name." }
  },
  required: ["isValid", "reason"]
};

// Internal themes to force variety
const THEMES = [
  "History: Legends of the 90s and 2000s",
  "Modern: Current stars (2020-2025)",
  "Tactical: Coach and Player relationships",
  "International: World Cups, Euros",
  "Transfers: Players who moved between big clubs",
  "Underdogs: Notable players from teams like Dortmund, Atletico",
  "Premier League Focus",
  "Serie A & La Liga giants",
  "Managers: Famous coaches and their key players",
  "Silverware: Winners of UCL, World Cup, Ballon d'Or",
  "National Duty: National team achievements"
];

const STRUCTURES = [
  "Entity A: TEAM, Entity B: PLAYER",
  "Entity A: COACH, Entity B: TEAM",
  "Entity A: TROPHY, Entity B: PLAYER",
  "Entity A: NATIONAL_TEAM, Entity B: COACH",
  "Entity A: PLAYER, Entity B: PLAYER",
  "Entity A: TEAM, Entity B: TEAM",
  "Entity A: TROPHY, Entity B: TEAM",
  "Entity A: COACH, Entity B: PLAYER",
  "Entity A: NATIONAL_TEAM, Entity B: TEAM"
];

/**
 * Helper to execute an API call with fallback logic for 429 errors.
 */
async function generateWithFallback(
  prompt: string, 
  schema: Schema, 
  temperature: number
): Promise<any> {
  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: temperature
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (error: any) {
      lastError = error;
      // If error is NOT a quota error (429), throw immediately.
      // If it IS a quota error, loop to next model.
      const isQuotaError = error.toString().includes("429") || (error.status === 429);
      if (!isQuotaError) {
        throw error;
      }
      console.warn(`Model ${model} hit rate limit. Switching to fallback...`);
      // Small delay before retrying with fallback
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

export const generateChallenge = async (
  difficulty: Difficulty = Difficulty.MEDIUM,
  excludeEntities: string[] = []
): Promise<Challenge> => {
  let difficultyContext = "";
  
  const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
  const randomStructure = STRUCTURES[Math.floor(Math.random() * STRUCTURES.length)];
  const recentExclusions = excludeEntities.slice(-20).join(", ");

  switch (difficulty) {
    case Difficulty.EASY:
      difficultyContext = "DIFFICULTY: EASY. Use ONLY extremely famous global superstars.";
      break;
    case Difficulty.HARD:
      difficultyContext = "DIFFICULTY: HARD. Use deeper cuts, mid-table teams, or historical players.";
      break;
    case Difficulty.MEDIUM:
    default:
      difficultyContext = "DIFFICULTY: MEDIUM. Use well-known players, coaches, and teams.";
      break;
  }

  const prompt = `
    Generate a challenging but solvable football connection puzzle.
    THEME: ${randomTheme}
    REQUIRED STRUCTURE: ${randomStructure}
    ${difficultyContext}
    
    Constraints:
    1. Output in ARABIC.
    2. Connection must be factual.
    3. Exclude: [${recentExclusions}].
    4. VARIETY: Use Coaches, Trophies, National Teams.
    5. IMAGES: Must be valid Wikimedia Commons HTTPS URLs (jpg/png) for Logos, Faces, Trophies.
    
    The concept is: Find a Player who connects Card A and Card B.
  `;

  const data = await generateWithFallback(prompt, challengeSchema, 1.1);
  
  return {
    id: crypto.randomUUID(),
    cardA: {
      name: data.cardA.name,
      type: data.cardA.type as EntityType,
      imageUrl: data.cardA.imageUrl,
      color: data.cardA.color
    },
    cardB: {
      name: data.cardB.name,
      type: data.cardB.type as EntityType,
      imageUrl: data.cardB.imageUrl,
      color: data.cardB.color
    },
    possibleAnswers: data.possibleSolutions
  };
};

const normalizeArabic = (text: string): string => {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/^(ال)/, '');
};

export const validateAnswer = async (
  cardA: string,
  cardB: string,
  userAnswer: string,
  possibleAnswers: string[] = [] 
): Promise<{ isValid: boolean; reason: string; correctAnswer?: string }> => {
  
  if (possibleAnswers && possibleAnswers.length > 0) {
    const normalizedInput = normalizeArabic(userAnswer);
    const isMatch = possibleAnswers.some(ans => {
       const normAns = normalizeArabic(ans);
       return normAns === normalizedInput || 
              (normAns.length > 3 && normalizedInput.includes(normAns)) || 
              (normalizedInput.length > 3 && normAns.includes(normalizedInput));
    });

    if (isMatch) return { isValid: true, reason: "إجابة صحيحة!" };
  }

  const prompt = `
    Context: Football trivia.
    Question: Connect "${cardA}" and "${cardB}".
    User Answer: "${userAnswer}".
    Verify if correct. Output in Arabic.
  `;

  try {
    const data = await generateWithFallback(prompt, validationSchema, 0.2);
    return {
      isValid: data.isValid,
      reason: data.reason,
      correctAnswer: data.correctAnswer
    };
  } catch (error: any) {
    console.error("Error validating via API:", error);
    return { 
      isValid: false, 
      reason: "عذراً، الخدمة مشغولة جداً. حاول مرة أخرى." 
    };
  }
};