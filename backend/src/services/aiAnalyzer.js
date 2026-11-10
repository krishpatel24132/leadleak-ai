
import { GoogleGenAI } from "@google/genai";

// const MODEL = "gemini-3.8-flash";
const MODEL = "gemini-3.5-flash-lite";

export async function analyzeWebsite(websiteData) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from backend .env");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert website conversion rate optimization auditor.

Analyze the following extracted website information.

WEBSITE DATA:
${JSON.stringify({
  website: websiteData.website,
  title: websiteData.title,
  description: websiteData.description,
  headings: websiteData.headings,
  text: (websiteData.text || "").slice(0, 10000),
})}

RULES:
1. Only identify issues supported by the supplied website data.
2. Never invent missing features or website elements.
3. Give practical recommendations for improving conversions.
4. If evidence is insufficient, clearly mention that.
5. Score only the observable website content, not actual business performance.
6. Return valid JSON only. No Markdown.

Required JSON structure:
{
  "score": 0,
  "summary": "Short website audit summary",
  "findings": [
    {
      "title": "Issue title",
      "description": "Evidence-based explanation",
      "priority": "HIGH",
      "recommendation": "Practical improvement"
    }
  ],
  "strengths": ["Existing positive elements"],
  "quickWins": ["Simple improvements"]
}

Score must be between 0 and 100.
Priority must be HIGH, MEDIUM or LOW.
Provide 3 to 5 findings when sufficient evidence exists.
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text;

  if (!responseText) {
    throw new Error("Gemini returned an empty response");
  }

  let audit;

  try {
    audit = JSON.parse(responseText);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  if (
    typeof audit.score !== "number" ||
    audit.score < 0 ||
    audit.score > 100 ||
    !Array.isArray(audit.findings) ||
    !Array.isArray(audit.strengths) ||
    !Array.isArray(audit.quickWins)
  ) {
    throw new Error("Gemini returned an invalid audit structure");
  }

  return audit;
}
