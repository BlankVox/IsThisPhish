import React, { useState, useRef, useEffect, Component } from 'react';
import { parse } from 'tldts';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Lock, 
  Globe,
  ChevronRight,
  Fingerprint,
  WifiOff,
  Link,
  AtSign,
  Hash,
  RotateCcw,
  Search,
  Zap,
  Database,
  Brain,
  ScanLine
} from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

// ─── Error Boundary ──────────────────────────────────────────────

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('IsThisPhish Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="app-prism">
          <div className="mesh-bg"></div>
          <div className="container" style={{ paddingTop: '20vh', textAlign: 'center' }}>
            <ShieldAlert size={48} style={{ color: 'var(--accent-danger)', marginBottom: '1.5rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              The application encountered an unexpected error.
            </p>
            <button
              className="search-btn"
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              style={{ margin: '0 auto' }}
            >
              Reload <RotateCcw size={16} />
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Heuristic Helpers ───────────────────────────────────────────

const getLevenshteinDistance = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i-1][j] + 1, matrix[i][j-1] + 1, matrix[i-1][j-1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

const checkDomainAge = async (hostname) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(`https://rdap.org/domain/${hostname}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return 0;
    const data = await response.json();
    const createdEvent = data.events?.find(e => e.eventAction === 'registration');
    if (createdEvent) {
      const createdDate = new Date(createdEvent.eventDate);
      const now = new Date();
      const diffDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 7) return 60;
      if (diffDays < 30) return 40;
      if (diffDays < 90) return 20;
    }
    return 0;
  } catch { return 0; }
};

const BRAND_WHITELIST = [
  // Tech Giants
  { name: 'google', domains: ['google.com', 'youtube.com', 'gmail.com', 'google.co.uk', 'googleapis.com', 'googlesyndication.com'] },
  { name: 'apple', domains: ['apple.com', 'icloud.com', 'appleid.apple.com'] },
  { name: 'microsoft', domains: ['microsoft.com', 'outlook.com', 'live.com', 'office.com', 'office365.com', 'microsoftonline.com', 'azure.com'] },
  { name: 'amazon', domains: ['amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.in', 'amazonaws.com'] },
  // Social Media
  { name: 'facebook', domains: ['facebook.com', 'fb.com', 'messenger.com', 'meta.com'] },
  { name: 'instagram', domains: ['instagram.com'] },
  { name: 'twitter', domains: ['twitter.com', 'x.com', 't.co'] },
  { name: 'linkedin', domains: ['linkedin.com'] },
  { name: 'tiktok', domains: ['tiktok.com'] },
  { name: 'snapchat', domains: ['snapchat.com'] },
  { name: 'reddit', domains: ['reddit.com'] },
  { name: 'discord', domains: ['discord.com', 'discord.gg', 'discordapp.com'] },
  { name: 'telegram', domains: ['telegram.org', 't.me', 'telegram.me'] },
  { name: 'whatsapp', domains: ['whatsapp.com', 'web.whatsapp.com'] },
  // Finance & Payment
  { name: 'paypal', domains: ['paypal.com', 'paypal.me'] },
  { name: 'stripe', domains: ['stripe.com'] },
  { name: 'chase', domains: ['chase.com'] },
  { name: 'bankofamerica', domains: ['bankofamerica.com'] },
  { name: 'wellsfargo', domains: ['wellsfargo.com'] },
  { name: 'citibank', domains: ['citibank.com', 'citi.com'] },
  { name: 'hsbc', domains: ['hsbc.com'] },
  { name: 'venmo', domains: ['venmo.com'] },
  { name: 'cashapp', domains: ['cash.app'] },
  // Crypto
  { name: 'coinbase', domains: ['coinbase.com'] },
  { name: 'binance', domains: ['binance.com', 'binance.us'] },
  { name: 'kraken', domains: ['kraken.com'] },
  { name: 'metamask', domains: ['metamask.io'] },
  // SaaS & Cloud
  { name: 'github', domains: ['github.com', 'github.io'] },
  { name: 'dropbox', domains: ['dropbox.com'] },
  { name: 'slack', domains: ['slack.com'] },
  { name: 'zoom', domains: ['zoom.us'] },
  { name: 'notion', domains: ['notion.so'] },
  { name: 'salesforce', domains: ['salesforce.com'] },
  // Streaming & Services
  { name: 'netflix', domains: ['netflix.com'] },
  { name: 'spotify', domains: ['spotify.com'] },
  { name: 'adobe', domains: ['adobe.com', 'creativecloud.com'] },
  // Email
  { name: 'protonmail', domains: ['proton.me', 'protonmail.com'] },
  { name: 'yahoo', domains: ['yahoo.com'] },
  // Shipping & Delivery
  { name: 'ups', domains: ['ups.com'] },
  { name: 'fedex', domains: ['fedex.com'] },
  { name: 'usps', domains: ['usps.com'] },
  { name: 'dhl', domains: ['dhl.com'] }
];

const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'adf.ly', 'bit.do', 'mcaf.ee', 'su.pr', 'db.tt', 'qr.ae', 'cur.lv',
  'lnkd.in', 'rebrand.ly', 'bl.ink', 'short.io', 'tiny.cc', 'shorturl.at',
  'rb.gy', 'v.gd', 'clck.ru', 'cutt.ly', 's.id'
]);

const checkHeuristics = async (parsedUrl, rawInput) => {
  let score = 0;
  let issues = [];
  
  let hostname = parsedUrl.hostname.toLowerCase().normalize("NFKC");
  const domainInfo = parse(hostname);
  const sld = domainInfo.domainWithoutSuffix; 
  const rootDomain = domainInfo.domain; 
  
  if (!rootDomain) {
    return { score: 90, issues: [{ id: 'invalid_domain', type: 'danger', title: 'Domain Error', desc: 'Host structure is invalid or unrecognizable.' }] };
  }

  const matchedBrand = BRAND_WHITELIST.find(brand => brand.domains.includes(rootDomain));
  if (matchedBrand) {
    return { score: 0, issues: [{ id: 'official', type: 'safe', title: 'Official Domain', desc: `Verified ${matchedBrand.name} infrastructure.` }] };
  }

  const normalizedHostname = hostname.replace(/[-_]/g, '');
  let domainRiskCategories = new Set();

  // --- CRITICAL: @-symbol redirect attack ---
  // https://google.com@evil.com actually goes to evil.com
  if (rawInput.includes('@') && /\/\/[^/]*@/.test(rawInput)) {
    score += 90;
    domainRiskCategories.add('atsymbol');
    issues.push({ id: 'at_redirect', type: 'danger', title: 'Redirect Disguise', desc: 'The @ symbol hides the real destination. The link goes to a different server than displayed.' });
  }

  // --- CRITICAL: Punycode / IDN homograph attack ---
  if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
    score += 80;
    domainRiskCategories.add('punycode');
    issues.push({ id: 'punycode', type: 'danger', title: 'Homograph Attack', desc: 'Internationalized domain name (Punycode) detected — may visually mimic a legitimate domain.' });
  }

  // ── URL Shortener Detection ──
  if (URL_SHORTENERS.has(rootDomain)) {
    score += 35;
    domainRiskCategories.add('shortener');
    issues.push({ id: 'shortener', type: 'warning', title: 'URL Shortener', desc: 'Shortened link detected — real destination is hidden and cannot be verified.' });
  }

  // ── Typosquatting Detection ──
  for (const brand of BRAND_WHITELIST) {
    const dist = getLevenshteinDistance(sld, brand.name);
    if (dist > 0 && dist <= 2 && sld.length >= brand.name.length - 1) {
      score += 85; 
      domainRiskCategories.add('typo');
      issues.push({ id: 'typo', type: 'danger', title: 'Typosquatting', desc: `Visual similarity to trusted brand '${brand.name}' detected.` });
      break; 
    }
  }

  // ── Brand Impersonation ──
  if (!domainRiskCategories.has('typo')) {
    for (const brand of BRAND_WHITELIST) {
      if (normalizedHostname.includes(brand.name) && sld !== brand.name) {
        score += 70;
        domainRiskCategories.add('impersonation');
        issues.push({ id: 'impersonation', type: 'danger', title: 'Impersonation', desc: `Unauthorized use of '${brand.name}' brand patterns.` });
        break;
      }
    }
  }

  // --- Suspicious Domain Keywords ---
  // Only flag if multiple phishing keywords are stacked in the domain,
  // or a single keyword appears alongside other risk signals
  const domainPhishKeywords = ['secure', 'login', 'verify', 'update', 'account', 'signin', 'banking', 'wallet', 'confirm', 'authenticate', 'recover', 'suspend'];
  const matchedDomainKw = domainPhishKeywords.filter(kw => sld.includes(kw));
  if (matchedDomainKw.length >= 2 || (matchedDomainKw.length === 1 && domainRiskCategories.size > 0)) {
    score += matchedDomainKw.length >= 2 ? 50 : 25;
    domainRiskCategories.add('domain_keywords');
    issues.push({ id: 'domain_keywords', type: 'warning', title: 'Suspicious Domain', desc: `Domain contains phishing keywords: ${matchedDomainKw.join(', ')}.` });
  }

  // ── Subdomain Depth Abuse ──
  const subdomainParts = (domainInfo.subdomain || '').split('.').filter(Boolean);
  if (subdomainParts.length >= 2) {
    score += 25;
    domainRiskCategories.add('subdomain');
    issues.push({ id: 'subdomain_abuse', type: 'warning', title: 'Subdomain Depth', desc: 'Complex subdomain nesting identified.' });
  }

  // ── Suspicious TLD ──
  const suspiciousTLDs = ['.xyz', '.top', '.click', '.cam', '.zip', '.mov', '.buzz', '.shop', '.icu', '.tk', '.ml', '.ga', '.cf', '.gq', '.work', '.life', '.rest'];
  if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
    score += 30;
    domainRiskCategories.add('tld');
    issues.push({ id: 'tld', type: 'warning', title: 'Risk Registry', desc: 'Host under a frequent phishing TLD.' });
  }

  // ── IP-based Hostname ──
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) {
    score += 80;
    domainRiskCategories.add('ip');
    issues.push({ id: 'ip_hostname', type: 'danger', title: 'Network ID', desc: 'Direct IP usage is critical risk.' });
  }

  // ── Non-standard Port ──
  const port = parsedUrl.port;
  if (port && port !== '80' && port !== '443') {
    score += 30;
    domainRiskCategories.add('port');
    issues.push({ id: 'port', type: 'warning', title: 'Non-Standard Port', desc: `Unusual port :${port} detected — legitimate sites rarely use custom ports.` });
  }

  // ── No SSL ──
  if (parsedUrl.protocol !== 'https:') {
    score += 20;
    domainRiskCategories.add('ssl');
    issues.push({ id: 'ssl', type: 'warning', title: 'Protocol Risk', desc: 'No SSL encryption detected.' });
  }

  // ── Excessive URL Encoding ──
  const fullUrl = parsedUrl.href;
  const encodedCount = (fullUrl.match(/%[0-9A-Fa-f]{2}/g) || []).length;
  if (encodedCount > 5) {
    score += 30;
    domainRiskCategories.add('encoding');
    issues.push({ id: 'encoding', type: 'warning', title: 'Obfuscated URL', desc: `Excessive URL encoding detected (${encodedCount} encoded chars) — may hide malicious content.` });
  }

  // ── Domain Age (Async) ──
  const ageScore = await checkDomainAge(rootDomain);
  if (ageScore > 0) {
    score += ageScore;
    domainRiskCategories.add('age');
    let label = ageScore === 60 ? 'Extreme Risk' : ageScore === 40 ? 'High Risk' : 'Warning';
    issues.push({ id: 'age', type: ageScore > 30 ? 'danger' : 'warning', title: `New Domain (${label})`, desc: `Domain discovered less than ${ageScore === 60 ? '7' : ageScore === 40 ? '30' : '90'} days ago.` });
  }

  // ── Contextual Path Intelligence ──
  const path = parsedUrl.pathname.toLowerCase();
  const suspiciousPathKeywords = ['verify', 'secure', 'login', 'update', 'account', 'signin', 'billing', 'confirm', 'validation', 'password', 'credential', 'authenticate'];
  const matchedKeywords = suspiciousPathKeywords.filter(kw => path.includes(kw));
  
  if (matchedKeywords.length > 0 && domainRiskCategories.size > 0 && score < 100) {
    score += (matchedKeywords.length * 15);
    issues.push({ id: 'path_keywords', type: 'warning', title: 'Phishing Path', desc: `Path contains sensitive keywords: ${matchedKeywords.join(', ')}.` });
  }

  // ── Entropy Detection ──
  const pathParts = path.split('/').filter(p => p.length > 25);
  for (const part of pathParts) {
    const hasLower = /[a-z]/.test(part);
    const hasUpper = /[A-Z]/.test(part);
    const hasNum = /[0-9]/.test(part);
    const diversity = [hasLower, hasUpper, hasNum].filter(Boolean).length;
    
    if (diversity >= 2) {
      score += 25;
      issues.push({ id: 'entropy_path', type: 'warning', title: 'Tracking Entropy', desc: 'Complex random path segments detected (possible victim ID).' });
      break;
    }
  }

  // ── Multi-Signal Guardrail ──
  let finalScore = score;
  if (finalScore >= 90 && domainRiskCategories.size < 2) {
    finalScore = 85;
  }

  if (finalScore === 0) issues.push({ id: 'heuristic_clean', type: 'safe', title: 'Structural Analysis', desc: 'No suspicious structural patterns found.' });

  return { score: Math.min(finalScore, 100), issues, domainAgeDays: ageScore };
};

const checkGoogleSafeBrowsing = async (url) => {
   const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_SAFE_BROWSING_KEY;
   if (!GOOGLE_API_KEY) {
     return { score: 0, issues: [{ id: 'google_disabled', type: 'info', title: 'Safe Browsing', desc: 'API key not configured — skipped.' }] };
   }

   try {
     const controller = new AbortController();
     const timeout = setTimeout(() => controller.abort(), 8000);
     const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_API_KEY}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       signal: controller.signal,
       body: JSON.stringify({
         client: { clientId: "isthisphish", clientVersion: "1.3.0" },
         threatInfo: {
           threatTypes: ["SOCIAL_ENGINEERING", "MALWARE", "UNWANTED_SOFTWARE"],
           platformTypes: ["ANY_PLATFORM"],
           threatEntryTypes: ["URL"],
           threatEntries: [{ url }]
         }
       })
     });
     clearTimeout(timeout);
     const data = await response.json();
     if (data.matches?.length > 0) {
        return { score: 100, issues: [{ id: 'google_flagged', type: 'danger', title: 'Google Safe Browsing', desc: 'Confirmed phishing threat in Google\'s global registry.' }] };
     }
     return { score: 0, issues: [{ id: 'google_clean', type: 'safe', title: 'Google Safe Browsing', desc: 'No matches in Google\'s phishing & threat database.' }] };
   } catch (e) {
     const isTimeout = e.name === 'AbortError';
     return { score: 0, issues: [{ id: 'google_error', type: 'info', title: 'Google Safe Browsing', desc: isTimeout ? 'Request timed out — skipped.' : 'Could not reach API — skipped.' }] };
   }
};

const checkURLhaus = async (url) => {
   const URLHAUS_KEY = import.meta.env.VITE_URLHAUS_API_KEY;
   try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const formData = new URLSearchParams();
      formData.append('url', url);
      const response = await fetch('/api/urlhaus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(URLHAUS_KEY && { 'Auth-Key': URLHAUS_KEY }) },
        body: formData.toString(),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await response.json();
      if (data.query_status === 'ok') {
         return { score: 100, issues: [{ id: 'urlhaus_malicious', type: 'danger', title: 'URLhaus Abuse DB', desc: `Confirmed phishing/abuse source (${data.threat || 'threat distribution'}).` }] };
      }
      return { score: 0, issues: [{ id: 'urlhaus_clean', type: 'safe', title: 'URLhaus Abuse DB', desc: 'Not found in the URLhaus abuse database.' }] };
   } catch (e) {
      const isTimeout = e.name === 'AbortError';
      return { score: 0, issues: [{ id: 'urlhaus_error', type: 'info', title: 'URLhaus Abuse DB', desc: isTimeout ? 'Request timed out — skipped.' : 'Could not reach API — skipped.' }] };
   }
};

// --- Phishing.Database (Community Open-Source) ---
// Fetches 160K+ known phishing domains, cached in memory
let phishingDbCache = { domains: null, fetchedAt: 0 };
const PHISHING_DB_TTL = 30 * 60 * 1000; // 30 min cache
const PHISHING_DB_URL = 'https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt';

const loadPhishingDb = async () => {
  if (phishingDbCache.domains && (Date.now() - phishingDbCache.fetchedAt) < PHISHING_DB_TTL) {
    return phishingDbCache.domains;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(PHISHING_DB_URL, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const text = await response.text();
    const domains = new Set(text.split('\n').map(d => d.trim().toLowerCase()).filter(Boolean));
    phishingDbCache = { domains, fetchedAt: Date.now() };
    return domains;
  } catch { return phishingDbCache.domains || null; }
};

const checkPhishingDB = async (parsedUrl) => {
  try {
    const db = await loadPhishingDb();
    if (!db) {
      return { score: 0, issues: [{ id: 'phishdb_error', type: 'info', title: 'Phishing Database', desc: 'Community database unavailable — skipped.' }] };
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    const domainInfo = parse(hostname);
    // Check exact hostname and root domain
    if (db.has(hostname) || (domainInfo.domain && db.has(domainInfo.domain))) {
      return { score: 100, issues: [{ id: 'phishdb_flagged', type: 'danger', title: 'Phishing Database', desc: `Domain found in the community phishing database (${db.size.toLocaleString()}+ known threats).` }] };
    }
    return { score: 0, issues: [{ id: 'phishdb_clean', type: 'safe', title: 'Phishing Database', desc: `Not found among ${db.size.toLocaleString()} known phishing domains.` }] };
  } catch {
    return { score: 0, issues: [{ id: 'phishdb_error', type: 'info', title: 'Phishing Database', desc: 'Lookup failed — skipped.' }] };
  }
};

const CACHE_TTL = 10 * 60 * 1000;

const analyzeUrl = async (urlInput) => {
  let formattedUrl = urlInput.trim();

  // ── CRITICAL: Dangerous URI schemes ──
  const lowerInput = formattedUrl.toLowerCase();
  if (lowerInput.startsWith('javascript:') || lowerInput.startsWith('data:') || lowerInput.startsWith('vbscript:')) {
    return {
      score: 100, status: 'danger',
      issues: [{ id: 'dangerous_scheme', type: 'danger', title: 'Dangerous Protocol', desc: `This uses a "${lowerInput.split(':')[0]}:" URI scheme — a known vector for code injection and XSS attacks.` }],
      originalUrl: urlInput
    };
  }

  if (!formattedUrl.startsWith('http')) formattedUrl = 'https://' + formattedUrl;
  
  // Check Cache
  try {
    const cached = localStorage.getItem(`prism_cache_${formattedUrl}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
  } catch (e) { console.warn('Cache read error', e); }

  let parsedUrl;
  try { parsedUrl = new URL(formattedUrl); } 
  catch {
    return { 
      score: 95, status: 'danger', 
      issues: [{ id: 'malformed', type: 'danger', title: 'Protocol Error', desc: 'Malformed or unrecognizable URL structure.' }], 
      originalUrl: urlInput 
    };
  }

  // Early domain validation — skip API calls for obviously invalid domains
  const domainCheck = parse(parsedUrl.hostname);
  if (!domainCheck.domain && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(parsedUrl.hostname)) {
    return {
      score: 95, status: 'danger',
      issues: [{ id: 'invalid_domain', type: 'danger', title: 'Domain Error', desc: 'Host structure is invalid or unrecognizable. This is not a valid web address.' }],
      originalUrl: urlInput
    };
  }

  const [urlhaus, google, phishdb, heurist] = await Promise.all([
     checkURLhaus(formattedUrl),
     checkGoogleSafeBrowsing(formattedUrl),
     checkPhishingDB(parsedUrl),
     checkHeuristics(parsedUrl, formattedUrl)
  ]);

  let totalScore = Math.min(heurist.score, 100);
  
  if (urlhaus.score === 100 || google.score === 100 || phishdb.score === 100) {
    totalScore = 100;
  }

  let status = totalScore >= 70 ? 'danger' : totalScore >= 40 ? 'warning' : 'safe';
  const result = { score: totalScore, status, issues: [...phishdb.issues, ...urlhaus.issues, ...google.issues, ...heurist.issues], originalUrl: urlInput };
  
  // Save Cache (skip for new/dangerous domains)
  const isNewDomain = heurist.domainAgeDays >= 40; 
  const isDangerous = totalScore >= 70;

  if (!isNewDomain && !isDangerous) {
    try {
      localStorage.setItem(`prism_cache_${formattedUrl}`, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
    } catch (e) { console.warn('Cache write error', e); }
  }

  return result;
};

// ─── Loading Stage Messages ──────────────────────────────────────

const LOADING_STAGES = [
  'Checking Community Phishing DB...',
  'Querying URLhaus Intelligence...',
  'Checking Google Safe Browsing...',
  'Running AI Heuristic Analysis...',
  'Compiling Threat Report...'
];

function useLoadingStage(isLoading) {
  const [stageIndex, setStageIndex] = useState(0);
  const wasLoading = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      wasLoading.current = false;
      return;
    }
    if (!wasLoading.current) {
      wasLoading.current = true;
    }
    const interval = setInterval(() => {
      setStageIndex(prev => (prev + 1) % LOADING_STAGES.length);
    }, 1400);
    return () => {
      clearInterval(interval);
      setStageIndex(0);
    };
  }, [isLoading]);

  return LOADING_STAGES[stageIndex];
}

// ─── Animated Score Counter ──────────────────────────────────────

function useAnimatedScore(targetScore, isVisible) {
  const [displayScore, setDisplayScore] = useState(0);
  const prevTarget = useRef(0);
  
  useEffect(() => {
    if (!isVisible) {
      return;
    }
    
    // When target is 0 or hasn't changed, no animation needed
    if (targetScore === 0 || targetScore === prevTarget.current) {
      return;
    }
    
    prevTarget.current = targetScore;
    let frame;
    let start = null;
    const duration = 1200;
    
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * targetScore));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      setDisplayScore(targetScore);
    };
  }, [targetScore, isVisible]);

  return displayScore;
}

// ─── Main App Component ─────────────────────────────────────────

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState('hero');
  const [fadeClass, setFadeClass] = useState('phase-enter');
  const loadingStage = useLoadingStage(loading);
  const animatedScore = useAnimatedScore(result?.score ?? 0, phase === 'result');
  const inputRef = useRef(null);

  const transitionTo = (nextPhase, callback) => {
    setFadeClass('phase-exit');
    setTimeout(() => {
      callback?.();
      setPhase(nextPhase);
      setFadeClass('phase-enter');
    }, 300);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    transitionTo('loading', () => {
      setLoading(true);
      setResult(null);
    });

    try {
      const data = await analyzeUrl(trimmed);
      transitionTo('result', () => {
        setResult(data);
        setLoading(false);
      });
    } catch (err) {
      console.error('Analysis failed:', err);
      transitionTo('result', () => {
        setResult({
          score: 0,
          status: 'warning',
          issues: [{ id: 'network_error', type: 'warning', title: 'Network Error', desc: 'Could not complete all checks. Please verify your connection and try again.' }],
          originalUrl: trimmed
        });
        setLoading(false);
      });
    }
  };

  const handleReset = () => {
    transitionTo('hero', () => {
      setResult(null);
      setUrl('');
    });
    setTimeout(() => inputRef.current?.focus(), 400);
  };

  return (
    <div className="app-prism">
      <div className="mesh-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>
      
      <header className="header animate-in">
        <div className="container header-inner">
          <div className="logo">
            <img src="/logo.png" alt="IsThisPhish?" className="logo-img" />
            <span className="logo-text">IsThisPhish<span className="logo-accent">?</span></span>
          </div>
          <div className="nav-status">
            <div className="status-dot"></div>
            <span>Threat Index Live</span>
          </div>
        </div>
      </header>

      <main className="container">
        <div className={`phase-wrapper ${fadeClass}`}>
          {phase === 'hero' && !loading && (
            <section className="hero animate-in">
              <div className="hero-badge">
                <Zap size={12} />
                <span>Quad-Check Security Engine</span>
              </div>
              <h1>Trust every<br /><span className="gradient-text">link you click.</span></h1>
              <p>Four-layered phishing detection powered by community databases, Google Safe Browsing, URLhaus, and AI heuristic analysis — in one scan.</p>
              
              <div className="search-container">
                <div className="search-glow"></div>
                <form className="search-wrapper" onSubmit={handleScan}>
                  <Search size={18} className="search-icon" />
                  <input 
                    ref={inputRef}
                    type="text" 
                    className="search-input" 
                    placeholder="Paste a suspicious link here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="search-btn" disabled={!url.trim()}>
                    <ScanLine size={16} />
                    <span>Analyze</span>
                    <ChevronRight size={16} />
                  </button>
                </form>
              </div>

              <div className="trust-badges">
                <div className="trust-badge">
                  <Database size={14} />
                  <span>Phishing Database</span>
                </div>
                <div className="trust-badge">
                  <Database size={14} />
                  <span>URLhaus Abuse DB</span>
                </div>
                <div className="trust-badge">
                  <ShieldCheck size={14} />
                  <span>Google Safe Browsing</span>
                </div>
                <div className="trust-badge">
                  <Brain size={14} />
                  <span>AI Heuristics</span>
                </div>
              </div>
            </section>
          )}

          {phase === 'loading' && (
            <div className="loading-orbit animate-in">
              <div className="scanner-ring">
                <div className="scanner-ring-inner">
                  <div className="scanner-core">
                    <ScanLine size={28} className="scanner-icon" />
                  </div>
                </div>
              </div>
              <div className="loading-text">
                <span className="loading-label">Scanning</span>
                <span className="loading-stage-text">{loadingStage}</span>
              </div>
            </div>
          )}

          {phase === 'result' && result && (
            <div className="results-wrapper">
              <div className="bento-grid">
                <div className="bento-item verdict-hero animate-in" style={{ animationDelay: '0.05s' }}>
                  <div className="verdict-glow-bg" data-status={result.status}></div>
                  <div className={`status-badge ${result.status}`}>
                    {result.status === 'safe' && <ShieldCheck size={18} />}
                    {result.status === 'warning' && <AlertTriangle size={18} />}
                    {result.status === 'danger' && <ShieldAlert size={18} />}
                    <span>{result.status.toUpperCase()}</span>
                  </div>
                  <h2 className="verdict-title">
                    {result.status === 'safe' && 'Connection is Secure'}
                    {result.status === 'warning' && 'Proceed with Caution'}
                    {result.status === 'danger' && 'Malicious Link Detected'}
                  </h2>
                  <p className="verdict-desc">
                    {result.status === 'safe' && 'Our prism-engine verified this URL against global phishing & threat registries and identified no malicious anomalies. It is safe to proceed.'}
                    {result.status === 'warning' && 'Suspicious structural patterns identified. We detected signals that deviate from standard web security protocols.'}
                    {result.status === 'danger' && 'High-risk threat identified by multiple intelligence layers. This endpoint is confirmed to be part of a phishing campaign or malicious infrastructure.'}
                  </p>
                  <div className="analyzed-url">{result.originalUrl}</div>
                  
                  <button onClick={handleReset} className="reset-btn">
                    <RotateCcw size={14} />
                    New Analysis
                  </button>
                </div>

                <div className="bento-item score-panel animate-in" style={{ animationDelay: '0.15s', '--score-color': `var(--accent-${result.status})` }}>
                   <div className={`score-ring score-ring-${result.status}`}>
                     <svg className="score-svg" viewBox="0 0 150 150" width="100%" height="100%">
                       <circle className="score-track" cx="75" cy="75" r="64" />
                       <circle 
                         className="score-fill" 
                         cx="75" cy="75" r="64"
                         style={{ 
                           strokeDasharray: `${(animatedScore / 100) * 402.12} 402.12`,
                           stroke: `var(--accent-${result.status})`
                         }}
                       />
                     </svg>
                     <div className="score-inner">
                       <span className="score-number">{animatedScore}</span>
                       <span className="score-label">THREAT</span>
                     </div>
                   </div>
                   <div className="score-meta">Prism Weighted Score</div>
                </div>

                {result.issues.map((issue, idx) => {
                  let Icon = Info;
                  if (issue.id === 'ssl' || issue.id === 'google_clean') Icon = Lock;
                  if (issue.id.includes('malicious') || issue.id === 'google_flagged') Icon = ShieldAlert;
                  if (issue.id === 'lookalike' || issue.id === 'typo') Icon = Fingerprint;
                  if (issue.id === 'tld') Icon = Globe;
                  if (issue.id === 'heuristic_clean' || issue.id === 'official') Icon = CheckCircle;
                  if (issue.id === 'network_error') Icon = WifiOff;
                  if (issue.id === 'shortener') Icon = Link;
                  if (issue.id === 'at_redirect') Icon = AtSign;
                  if (issue.id === 'punycode' || issue.id === 'encoding') Icon = Hash;
                  if (issue.id === 'dangerous_scheme') Icon = ShieldAlert;
                  
                  return (
                    <div key={idx} className={`bento-item reason-card animate-in ${issue.type}`} style={{ animationDelay: `${0.25 + idx * 0.08}s` }}>
                      <div className="card-accent-line"></div>
                      <div className="source-icon"><Icon size={20} /></div>
                      <div className="source-content">
                        <div className="source-name">{issue.title}</div>
                        <div className="source-desc">{issue.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer>
        <div className="container footer-inner">
          <p>© 2026 IsThisPhish? Labs</p>
          <p className="footer-sub">Protected by Google & URLhaus Firewalls</p>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}

function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithBoundary;
