/**
 * Safe Link Checker — extracts URLs from messages and flags suspicious ones.
 * Runs entirely locally with heuristic checks (no external API calls).
 */

const SUSPICIOUS_TLDS = [
  ".xyz", ".top", ".click", ".loan", ".work", ".gq", ".ml", ".cf", ".tk",
  ".buzz", ".icu", ".cam", ".rest", ".monster", ".surf",
];

const TRUSTED_DOMAINS = [
  "google.com", "facebook.com", "youtube.com", "amazon.com", "microsoft.com",
  "apple.com", "gov.sg", "gov.uk", "gov.au", "gov.us", "gov.my",
  "paypal.com", "stripe.com", "netflix.com", "linkedin.com", "twitter.com",
  "instagram.com", "whatsapp.com", "telegram.org",
];

// Extract all URLs from text
function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

// Analyze a single URL for suspicious signals
function analyzeUrl(url) {
  const flags = [];
  let risk = "low";

  let hostname = "";
  try {
    const parsed = new URL(url.startsWith("www.") ? "http://" + url : url);
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return { url, hostname: url, risk: "high", flags: ["Invalid or malformed URL"] };
  }

  // Check for IP address instead of domain
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    flags.push("Uses an IP address instead of a domain name");
    risk = "high";
  }

  // Check suspicious TLDs
  const tld = "." + hostname.split(".").pop();
  if (SUSPICIOUS_TLDS.includes(tld)) {
    flags.push(`Uses uncommon domain ending (${tld})`);
    risk = elevate(risk, "medium");
  }

  // Check for lookalike domains (e.g., g00gle.com, paypa1.com)
  const lookalikes = /(\d+|[0-9])[a-z]|[a-z](\d+|[0-9])/i;
  const domainBase = hostname.split(".").slice(0, -1).join(".");
  if (lookalikes.test(domainBase) && !TRUSTED_DOMAINS.some((d) => hostname.endsWith(d))) {
    flags.push("Domain name mixes letters and numbers (common in fake sites)");
    risk = elevate(risk, "medium");
  }

  // Check for excessive subdomains
  const parts = hostname.split(".");
  if (parts.length > 3) {
    flags.push("Has many subdomains (used to hide the real website)");
    risk = elevate(risk, "medium");
  }

  // Check for very long domain
  if (hostname.length > 40) {
    flags.push("Unusually long web address");
    risk = elevate(risk, "medium");
  }

  // Check for URL shorteners
  const shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "short.link"];
  if (shorteners.some((s) => hostname === s || hostname.endsWith("." + s))) {
    flags.push("Uses a link shortener (hides the real destination)");
    risk = elevate(risk, "medium");
  }

  // Check if trusted
  const isTrusted = TRUSTED_DOMAINS.some((d) => hostname === d || hostname.endsWith("." + d));
  if (isTrusted && flags.length === 0) {
    return { url, hostname, risk: "low", flags: ["Known trusted website"], trusted: true };
  }

  if (flags.length === 0) {
    flags.push("No obvious red flags, but still be cautious with unfamiliar links");
  }

  return { url, hostname, risk, flags, trusted: false };
}

function elevate(current, to) {
  const levels = { low: 0, medium: 1, high: 2 };
  return levels[to] > levels[current] ? to : current;
}

function checkLinks(text) {
  const urls = extractUrls(text);
  if (urls.length === 0) return { found: false, links: [] };
  return {
    found: true,
    links: urls.map(analyzeUrl),
  };
}

module.exports = { checkLinks };
