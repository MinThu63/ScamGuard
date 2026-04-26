const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "gemma3";

function buildSystemPrompt(lang) {
  const langInstruction = lang && lang !== "en"
    ? `\nCRITICAL: You MUST write the "explanation" and "tips" entirely in ${LANG_NAMES[lang] || lang}. The verdict value must stay in English (safe/suspicious/scam). Only the explanation and tips should be translated.`
    : "";

  return `You are ScamGuard, a kind and protective digital companion for seniors.
Your job is to analyze messages (SMS, WhatsApp, email) and determine if they are scams.

ALWAYS respond in this exact JSON format and nothing else:
{
  "verdict": "safe" | "suspicious" | "scam",
  "explanation": "A short, gentle explanation in plain language. Speak as if talking to a grandparent you love.",
  "tips": ["Actionable tip 1", "Actionable tip 2"]
}

Rules:
- Be warm, patient, and never condescending.
- Use simple words. Avoid jargon.
- If it looks like a scam, clearly say so and explain WHY in a reassuring way.
- If it's safe, still gently remind them of good habits.
- Common scam signs: urgency, threats, asking for passwords/PINs/OTPs, unknown links, impersonating banks or government, too-good-to-be-true offers, requests for gift cards.
- For Singapore context: be aware of common local scams involving DBS/OCBC/UOB banks, SingPost, IRAS, MOM, CPF, Singtel, and government impersonation.
- ONLY output valid JSON. No markdown, no extra text.${langInstruction}`;
}

const LANG_NAMES = {
  en: "English",
  zh: "Simplified Chinese (简体中文)",
  ms: "Malay (Bahasa Melayu)",
  ta: "Tamil (தமிழ்)",
};

async function analyzeMessage(message, lang = "en") {
  const systemPrompt = buildSystemPrompt(lang);

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: `Analyze this message and determine if it is a scam:\n\n"${message}"`,
      system: systemPrompt,
      stream: false,
      options: { temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const data = await response.json();
  const text = data.response.trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse LLM response as JSON");
  }

  const result = JSON.parse(jsonMatch[0]);

  if (!["safe", "suspicious", "scam"].includes(result.verdict)) {
    result.verdict = "suspicious";
  }
  if (!result.explanation) {
    result.explanation = "I wasn't sure about this one. Please be careful.";
  }
  if (!Array.isArray(result.tips)) {
    result.tips = [];
  }

  return result;
}

module.exports = { analyzeMessage };
