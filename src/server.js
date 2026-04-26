const express = require("express");
const path = require("path");
const fs = require("fs");
const { analyzeMessage } = require("./ollama");
const { checkLinks } = require("./linkchecker");

const app = express();
const PORT = process.env.PORT || 3000;
const HISTORY_FILE = path.join(__dirname, "..", "data", "history.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Ensure data directory exists
fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });

// --- Analyze endpoint ---
app.post("/api/analyze", async (req, res) => {
  const { message, lang } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Please paste a message to check." });
  }

  const trimmed = message.trim();
  const language = ["en", "zh", "ms", "ta"].includes(lang) ? lang : "en";

  // Run link check in parallel with LLM analysis
  const linkResult = checkLinks(trimmed);

  try {
    const result = await analyzeMessage(trimmed, language);
    result.links = linkResult;

    // Save to history
    saveToHistory(trimmed, result);

    res.json(result);
  } catch (err) {
    console.error("Analysis error:", err.message);
    const errorResult = {
      verdict: "error",
      explanation:
        "I'm sorry, I couldn't analyze that right now. Please make sure Ollama is running on your computer and try again.",
      tips: [
        "Check that Ollama is running (run: ollama serve)",
        "Make sure the gemma3 model is pulled (run: ollama pull gemma3)",
      ],
      links: linkResult,
    };
    res.json(errorResult);
  }
});

// --- History endpoints ---
app.get("/api/history", (_req, res) => {
  const history = loadHistory();
  res.json(history);
});

app.delete("/api/history", (_req, res) => {
  try {
    fs.writeFileSync(HISTORY_FILE, "[]", "utf-8");
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Could not clear history." });
  }
});

// --- Health check ---
app.get("/api/health", async (_req, res) => {
  try {
    const resp = await fetch("http://localhost:11434/api/tags");
    if (resp.ok) {
      const data = await resp.json();
      const models = data.models?.map((m) => m.name) || [];
      return res.json({ ollama: true, models });
    }
  } catch {
    // Ollama not reachable
  }
  res.json({ ollama: false, models: [] });
});

// --- History helpers ---
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
    }
  } catch {
    // corrupted file, reset
  }
  return [];
}

function saveToHistory(message, result) {
  try {
    const history = loadHistory();
    history.unshift({
      id: Date.now(),
      date: new Date().toISOString(),
      message: message.substring(0, 500),
      verdict: result.verdict,
      explanation: result.explanation,
      tips: result.tips,
      links: result.links,
    });
    // Keep last 50 entries
    const trimmed = history.slice(0, 50);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (err) {
    console.error("Could not save history:", err.message);
  }
}

app.listen(PORT, () => {
  console.log(`ScamGuard running at http://localhost:${PORT}`);
});
