// --- DOM Elements ---
const messageInput = document.getElementById("message-input");
const checkBtn = document.getElementById("check-btn");
const resultSection = document.getElementById("result");
const resultCard = document.getElementById("result-card");
const verdictIcon = document.getElementById("verdict-icon");
const verdictText = document.getElementById("verdict-text");
const explanation = document.getElementById("explanation");
const tipsList = document.getElementById("tips-list");
const speakBtn = document.getElementById("speak-btn");
const linksSection = document.getElementById("links-section");
const linksList = document.getElementById("links-list");
const ollamaStatus = document.getElementById("ollama-status");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");

// =============================================
// Language
// =============================================
const SPEECH_LANGS = { en: "en-US", zh: "zh-CN", ms: "ms-MY", ta: "ta-IN" };
let currentLang = localStorage.getItem("sg-lang") || "en";

function t(key) {
  return (UI_STRINGS[currentLang] && UI_STRINGS[currentLang][key]) || UI_STRINGS.en[key] || key;
}

function getVerdictConfig() {
  return {
    safe: { icon: "✅", label: t("verdictSafe") },
    suspicious: { icon: "⚠️", label: t("verdictSuspicious") },
    scam: { icon: "🚨", label: t("verdictScam") },
    error: { icon: "❌", label: t("verdictError") },
  };
}

function applyLanguage() {
  localStorage.setItem("sg-lang", currentLang);
  document.documentElement.lang = currentLang === "zh" ? "zh-Hans" : currentLang;

  // Update all lang buttons
  document.querySelectorAll(".lang-btn").forEach((b) => {
    const isActive = b.dataset.lang === currentLang;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-checked", isActive);
  });

  // Translate static UI
  document.getElementById("lang-label").textContent = t("language");
  document.getElementById("font-label").textContent = t("textSize");
  document.querySelector("h1").textContent = t("title");
  document.querySelector(".subtitle").textContent = t("subtitle");
  document.querySelector('[data-tab="checker"]').textContent = t("tabCheck");
  document.querySelector('[data-tab="history"]').textContent = t("tabHistory");
  document.querySelector('.input-section label').textContent = t("inputLabel");
  messageInput.placeholder = t("inputPlaceholder");
  document.getElementById("input-help").textContent = t("privacyNote");
  checkBtn.textContent = t("checkBtn");
  document.querySelector("#tips-section h3").textContent = t("tipsHeading");
  document.querySelector("#links-section h3").textContent = t("linksHeading");
  document.querySelector(".history-header h2").textContent = t("historyTitle");
  clearHistoryBtn.textContent = t("clearAll");
  document.querySelector(".history-section > .help-text").textContent = t("historyHelp");
  document.querySelector("footer p").textContent = t("footer");

  // Update speak button if not speaking
  if (!speechSynthesis.speaking) {
    speakBtn.textContent = t("readAloud");
  }

  // Re-render empty state if history tab is showing
  const emptyState = historyList.querySelector(".empty-state");
  if (emptyState) emptyState.textContent = t("emptyHistory");
}

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    applyLanguage();
  });
});

// Apply on load
applyLanguage();

// =============================================
// Font Size Controls (persisted in localStorage)
// =============================================
const MIN_SCALE = 0.9;
const MAX_SCALE = 1.6;
const STEP = 0.1;

function getFontScale() {
  return parseFloat(localStorage.getItem("sg-font-scale")) || 1;
}

function setFontScale(scale) {
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
  localStorage.setItem("sg-font-scale", scale);
  document.documentElement.style.setProperty("--font-scale", scale);
}

setFontScale(getFontScale());

document.getElementById("font-increase").addEventListener("click", () => setFontScale(getFontScale() + STEP));
document.getElementById("font-decrease").addEventListener("click", () => setFontScale(getFontScale() - STEP));
document.getElementById("font-reset").addEventListener("click", () => setFontScale(1));

// =============================================
// Tabs (with keyboard arrow navigation)
// =============================================
const tabBtns = document.querySelectorAll(".tab-btn");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  btn.addEventListener("keydown", (e) => {
    const tabs = Array.from(tabBtns);
    const idx = tabs.indexOf(btn);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = tabs[(idx + 1) % tabs.length];
      next.focus();
      switchTab(next.dataset.tab);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
      prev.focus();
      switchTab(prev.dataset.tab);
    }
  });
});

function switchTab(tabName) {
  tabBtns.forEach((b) => {
    const isActive = b.dataset.tab === tabName;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", isActive);
    b.setAttribute("tabindex", isActive ? "0" : "-1");
  });
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  document.getElementById("tab-" + tabName).classList.add("active");
  if (tabName === "history") loadHistory();
}

// =============================================
// Analyze
// =============================================
checkBtn.addEventListener("click", analyze);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) analyze();
});

async function analyze() {
  const message = messageInput.value.trim();
  if (!message) { messageInput.focus(); return; }

  checkBtn.disabled = true;
  checkBtn.textContent = t("analyzing");
  checkBtn.classList.add("loading");
  checkBtn.setAttribute("aria-busy", "true");
  resultSection.classList.add("hidden");
  stopSpeaking();

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, lang: currentLang }),
    });
    const data = await res.json();
    showResult(data);
  } catch {
    showResult({
      verdict: "error",
      explanation: t("serverError"),
      tips: [],
      links: { found: false, links: [] },
    });
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = t("checkBtn");
    checkBtn.classList.remove("loading");
    checkBtn.setAttribute("aria-busy", "false");
  }
}

// =============================================
// Show Result
// =============================================
function showResult(data) {
  const vc = getVerdictConfig();
  const v = vc[data.verdict] || vc.suspicious;

  resultCard.className = "result-card " + data.verdict;
  verdictIcon.textContent = v.icon;
  verdictText.textContent = v.label;
  explanation.textContent = data.explanation;

  tipsList.innerHTML = "";
  if (data.tips && data.tips.length) {
    document.querySelector("#tips-section h3").textContent = t("tipsHeading");
    data.tips.forEach((tip) => {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.appendChild(li);
    });
  }

  // Link checker results
  if (data.links && data.links.found) {
    linksSection.classList.remove("hidden");
    document.querySelector("#links-section h3").textContent = t("linksHeading");
    linksList.innerHTML = "";
    data.links.links.forEach((link) => {
      const riskLabel = t("risk" + link.risk.charAt(0).toUpperCase() + link.risk.slice(1));
      const div = document.createElement("div");
      div.className = "link-item risk-" + link.risk;
      div.setAttribute("role", "article");
      div.setAttribute("aria-label", link.hostname + " — " + riskLabel);
      div.innerHTML = `
        <div class="link-url">${escapeHtml(link.url)}</div>
        <span class="link-risk ${link.risk}">${riskLabel}</span>
        <ul class="link-flags" role="list">
          ${link.flags.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
        </ul>
      `;
      linksList.appendChild(div);
    });
  } else {
    linksSection.classList.add("hidden");
  }

  resultSection.classList.remove("hidden");
  verdictText.focus();
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// =============================================
// Text-to-Speech
// =============================================
speakBtn.addEventListener("click", () => {
  if (speechSynthesis.speaking) {
    stopSpeaking();
    return;
  }

  const text = verdictText.textContent + ". " + explanation.textContent;
  const tips = Array.from(tipsList.children).map((li) => li.textContent);
  const fullText = tips.length
    ? text + " " + t("tipsHeading") + " " + tips.join(". ")
    : text;

  const utterance = new SpeechSynthesisUtterance(fullText);
  utterance.rate = 0.8;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = SPEECH_LANGS[currentLang] || "en-US";

  utterance.onstart = () => {
    speakBtn.textContent = t("stopReading");
    speakBtn.classList.add("speaking");
    speakBtn.setAttribute("aria-label", t("stopReading"));
  };
  utterance.onend = () => {
    speakBtn.textContent = t("readAloud");
    speakBtn.classList.remove("speaking");
    speakBtn.setAttribute("aria-label", t("readAloud"));
  };

  speechSynthesis.speak(utterance);
});

function stopSpeaking() {
  speechSynthesis.cancel();
  speakBtn.textContent = t("readAloud");
  speakBtn.classList.remove("speaking");
  speakBtn.setAttribute("aria-label", t("readAloud"));
}

// =============================================
// History
// =============================================
async function loadHistory() {
  try {
    const res = await fetch("/api/history");
    const history = await res.json();
    renderHistory(history);
  } catch {
    historyList.innerHTML = `<p class="empty-state">${t("serverError")}</p>`;
  }
}

function renderHistory(history) {
  if (!history.length) {
    historyList.innerHTML = `<p class="empty-state">${t("emptyHistory")}</p>`;
    return;
  }

  const vc = getVerdictConfig();
  historyList.innerHTML = "";

  history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item " + item.verdict;
    div.setAttribute("role", "listitem");
    div.setAttribute("tabindex", "0");

    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString(SPEECH_LANGS[currentLang] || "en-US", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const v = vc[item.verdict] || vc.suspicious;

    div.innerHTML = `
      <div class="history-date">${dateStr}</div>
      <div class="history-verdict">${v.icon} ${v.label}</div>
      <div class="history-message">${escapeHtml(item.message)}</div>
    `;

    const openItem = () => {
      switchTab("checker");
      messageInput.value = item.message;
      showResult(item);
    };

    div.addEventListener("click", openItem);
    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItem(); }
    });

    historyList.appendChild(div);
  });
}

clearHistoryBtn.addEventListener("click", async () => {
  if (!confirm(t("clearConfirm"))) return;
  try {
    await fetch("/api/history", { method: "DELETE" });
    renderHistory([]);
  } catch {
    alert(t("serverError"));
  }
});

// =============================================
// Health Check
// =============================================
async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.ollama) {
      ollamaStatus.innerHTML = `<span class="connected">✅ Connected to Ollama</span> — Models: ${data.models.join(", ") || "none"}`;
    } else {
      ollamaStatus.innerHTML = `<span class="disconnected">⚠️ Ollama not detected.</span>`;
    }
  } catch {
    ollamaStatus.innerHTML = `<span class="disconnected">⚠️ Cannot reach server.</span>`;
  }
}

checkHealth();
