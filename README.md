# 🛡️ ScamGuard — Anti-Scam Sandbox & Financial Companion for Seniors

> A privacy-first web application that helps Singapore seniors identify phishing, impersonation, and financial scams — entirely offline using a local LLM. No data ever leaves the device.

---

## Table of Contents

- [Motivation](#motivation)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Technical Highlights](#technical-highlights)
- [Getting Started](#getting-started)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [License](#license)

---

## Motivation

Seniors in Singapore are disproportionately targeted by digital scams. In 2024 alone, scam losses in Singapore exceeded SGD 385 million, with seniors being the most vulnerable demographic. Common attack vectors include:

- **Bank impersonation** — fake SMS from DBS, OCBC, UOB asking to "verify" accounts
- **Government impersonation** — messages pretending to be from IRAS, MOM, CPF, or SingPost
- **Phishing links** — shortened or lookalike URLs designed to steal credentials
- **Urgency tactics** — threats of account freezing, legal action, or missed deliveries

Existing solutions either require cloud processing (raising privacy concerns for sensitive financial messages) or are too technical for seniors to use.

ScamGuard was built to solve both problems: a **dead-simple interface** that any senior can use, powered by a **fully local LLM** that ensures no message ever leaves their computer. It bridges fintech awareness, community service, and data privacy into a single practical tool.

---

## Features

### Core — Scam Detection
- Paste any SMS, WhatsApp, or email message and get an instant verdict: **Safe**, **Suspicious**, or **Scam**
- Gentle, jargon-free explanations written as if speaking to a loved grandparent
- Actionable safety tips with every analysis
- Singapore-specific scam awareness (DBS, OCBC, UOB, SingPost, IRAS, MOM, CPF, Singtel)

### Safe Link Checker
- Automatically extracts all URLs from pasted messages
- Flags suspicious domains using heuristic analysis: uncommon TLDs, IP-based URLs, link shorteners, lookalike domains, excessive subdomains
- Color-coded risk levels (low / medium / high) for each link

### Multi-Language Support
- Full UI and LLM responses in **English, 中文 (Chinese), Melayu (Malay), and தமிழ் (Tamil)**
- Covers all four official languages of Singapore
- Language preference persisted across sessions

### Text-to-Speech
- One-click "Read Aloud" button reads the full verdict, explanation, and tips
- Slower speech rate (0.8x) optimized for senior listeners
- Correct voice locale per language (en-US, zh-CN, ms-MY, ta-IN)

### Scan History
- All past analyses saved locally in a JSON file
- Clickable history entries to review past checks
- Family members can review what was flagged
- One-click clear with confirmation dialog
- Keeps last 50 entries automatically

### Accessibility
- Base font size of 24px with adjustable A−/A/A+ controls (90%–160%), persisted in localStorage
- Skip-to-content link for keyboard navigation
- Full keyboard support: arrow-key tab navigation, Enter/Space activation on history items
- `aria-live` regions for screen reader announcements
- `prefers-reduced-motion` support — disables all animations
- `prefers-contrast: more` support — thicker borders, pure black text
- High-contrast color palette passing WCAG AA contrast ratios
- Minimum 48px touch targets on all interactive elements
- Proper ARIA roles: `tablist`, `tabpanel`, `radiogroup`, `role="list"`, `aria-busy`

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Frontend)                │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Language  │  │ Font Size│  │   Tab Navigation  │  │
│  │ Picker   │  │ Controls │  │ (Checker/History)  │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           Message Input + Analyze            │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │ POST /api/analyze              │
│  ┌──────────────────▼───────────────────────────┐   │
│  │  Result Card + Link Report + Text-to-Speech  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                      │
                      │ HTTP (localhost only)
                      ▼
┌─────────────────────────────────────────────────────┐
│               Node.js + Express Server              │
│                                                     │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  /api/     │  │  /api/      │  │  /api/       │  │
│  │  analyze   │  │  history    │  │  health      │  │
│  └─────┬──────┘  └──────┬──────┘  └──────────────┘  │
│        │                │                            │
│  ┌─────▼──────┐  ┌──────▼──────┐                     │
│  │ Link       │  │ history.json│                     │
│  │ Checker    │  │ (local file)│                     │
│  └─────┬──────┘  └─────────────┘                     │
│        │                                             │
│  ┌─────▼──────────────────────────────────────────┐  │
│  │  Ollama Client (language-aware system prompt)  │  │
│  └─────────────────────┬──────────────────────────┘  │
└────────────────────────┼────────────────────────────┘
                         │ HTTP (localhost:11434)
                         ▼
┌─────────────────────────────────────────────────────┐
│                  Ollama (Local LLM)                  │
│                   Gemma 3 / Gemma 4                  │
│              Runs 100% on local machine              │
└─────────────────────────────────────────────────────┘
```

**Key design decision:** Zero external API calls. The entire pipeline — from user input to LLM inference to result display — runs on `localhost`. Sensitive financial messages never touch the internet.

---

## Project Structure

```
scam-guard-senior/
├── src/
│   ├── server.js          # Express server — routes, history persistence
│   ├── ollama.js          # Ollama LLM client — language-aware prompt engineering
│   └── linkchecker.js     # URL extraction + heuristic risk analysis
├── public/
│   ├── index.html         # Accessible, semantic HTML with ARIA roles
│   ├── style.css          # Senior-friendly CSS — large text, high contrast, responsive
│   ├── app.js             # Frontend logic — tabs, TTS, font scaling, analysis
│   └── i18n.js            # UI translations (English, Chinese, Malay, Tamil)
├── data/
│   └── history.json       # Local scan history (auto-created, gitignored)
├── package.json
└── README.md
```

---

## Technical Highlights

### Privacy-First Architecture
- All message analysis happens via Ollama running locally — no cloud LLM APIs
- No telemetry, no analytics, no external network requests
- History stored as a local JSON file, never synced anywhere
- Designed so seniors (or their families) can trust that sensitive bank messages stay private

### Prompt Engineering
- Carefully crafted system prompt instructs the LLM to respond as a "patient, protective digital companion"
- Enforces structured JSON output (`verdict`, `explanation`, `tips`) for reliable parsing
- Language parameter dynamically modifies the system prompt to produce responses in the selected language while keeping the verdict key in English for consistent frontend handling
- Singapore-specific context injected: awareness of local banks, government agencies, and telcos commonly impersonated in scams

### Heuristic Link Analysis
- Extracts URLs using regex, then runs each through multiple checks:
  - Suspicious TLD detection (`.xyz`, `.top`, `.click`, etc.)
  - IP-address-based URL detection
  - Lookalike domain detection (letter/number mixing like `paypa1.com`)
  - Link shortener identification (`bit.ly`, `tinyurl.com`, etc.)
  - Excessive subdomain detection (used to hide real domains)
  - Trusted domain allowlist (major banks, government, social platforms)
- No external API calls — all checks are local heuristics

### Accessibility Engineering
- Semantic HTML5 with proper landmark roles
- Full keyboard operability (arrow keys for tabs, Enter/Space for actions)
- Screen reader support via `aria-live`, `aria-busy`, `aria-label`, `aria-selected`
- Dynamic font scaling with CSS custom properties (`--font-scale`)
- Respects OS-level preferences: `prefers-reduced-motion`, `prefers-contrast`
- Web Speech API integration with language-appropriate voice selection

### Zero-Dependency Frontend
- No React, no Vue, no build step — just vanilla HTML, CSS, and JavaScript
- Keeps the app lightweight, fast to load, and easy to maintain
- Single Express dependency on the backend

---

## Getting Started

### Prerequisites

1. **Node.js** v18 or later — [Download](https://nodejs.org)
2. **Ollama** — [Download](https://ollama.com/download)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/scam-guard-senior.git
cd scam-guard-senior

# 2. Install dependencies
npm install

# 3. Pull a Gemma model via Ollama
ollama pull gemma3

# 4. Make sure Ollama is running
ollama serve

# 5. Start ScamGuard
npm start
```

Open **http://localhost:3000** in your browser.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `gemma3` | Model name (supports gemma3, gemma4, etc.) |

---

## Screenshots

> Add your screenshots here. Suggested captures:

| Screen | Description |
|--------|-------------|
| `screenshots/home.png` | Main checker interface with language picker |
| `screenshots/scam-result.png` | Scam verdict with link analysis |
| `screenshots/safe-result.png` | Safe verdict with reassuring message |
| `screenshots/chinese-ui.png` | Full Chinese language interface |
| `screenshots/history.png` | History tab with past checks |
| `screenshots/mobile.png` | Responsive mobile view |

---

## Roadmap

- [ ] **Browser extension** — right-click any text on any webpage to check it
- [ ] **Family dashboard** — opt-in local network page for trusted family members to monitor flagged messages
- [ ] **Common scam library** — educational page with real-world scam templates and explanations
- [ ] **Bank contact directory** — verified phone numbers for Singapore banks so seniors don't call scam numbers
- [ ] **Offline mode** — bundle a smaller quantized model for use without Ollama
- [ ] **Monthly scam alerts** — curated feed of trending scam patterns in Singapore
- [ ] **Export/import history** — let seniors share their scan history with family or police
- [ ] **Dark mode** — toggle with high-contrast option for low-light usage

---

## License

MIT
