# IsThisPhish - Advanced Phishing Threat Analyzer

IsThisPhish is a client-side cybersecurity tool engineered to instantly evaluate the safety of suspicious URLs. Built with a focus on speed, privacy, and accuracy, it features a proprietary Quad-Check Security Engine and a premium, high-fidelity dark mode interface.

![IsThisPhish Dashboard Overview](/public/screenshot-hero.png)

## Core Architecture

IsThisPhish evaluates every URL concurrently across four discrete security layers, neutralizing threats before they can be accessed.

### 1. Phishing.Database Integration
Queries an in-memory, O(1) indexed cache of over 160,000 actively confirmed phishing domains. Sourced directly from the community-driven Phishing.Database project and updated dynamically on the client.

### 2. URLhaus Abuse Intelligence
Executes a direct API query against the URLhaus global malware and threat distribution registry, instantaneously flagging confirmed malicious infrastructure.

### 3. Google Safe Browsing Registry
Verifies the target URL against Google's global Safe Browsing database, specifically hunting for Social Engineering, Malware, and Unwanted Software signatures.

### 4. Zero-Day Heuristics Engine
A custom rule-based engine designed to catch zero-day phishing attacks that databases haven't mapped yet:
- **Redirect Disguises**: Flags `@`-symbol authentication bypass attempts (`https://google.com@openphish.com`).
- **Homograph Attacks**: Detects `xn--` Punycode internationalized domains mimicking authentic brands.
- **Protocol Injection**: Pre-parse blocking of `javascript:`, `data:`, and `vbscript:` vectors.
- **Deep Brand Protection**: Actively defends against typosquatting targeting 40+ high-value institutions across Finance, Crypto, Social, and Tech sectors.
- **Obfuscation Detection**: Analyzes URL entropy, excessive hex-encoding, non-standard active ports, and recognized URL shortener masking.

![Threat Analysis Results Panel](/public/screenshot-results.png)

## Technology Stack

- **Framework**: React 19 (Vite Build Environment)
- **Styling**: Vanilla CSS3 with advanced glassmorphism and dynamic micro-interactions
- **Parsing**: `tldts` for accurate Top-Level Domain and Subdomain extraction
- **Icons**: Lucide React

## Deployment & Installation

### Local Development

1. Clone the repository to your local machine.
2. Install the necessary node dependencies:
```bash
npm install
```
3. Environmental Configuration (Required for Google Safe Browsing):
Create a `.env` file in the root directory and add your API credentials:
```env
VITE_GOOGLE_SAFE_BROWSING_KEY=your_api_key_here
VITE_URLHAUS_API_KEY=your_api_key_here # Optional
```
4. Initialize the development server:
```bash
npm run dev
```

### Production Build

To compile the application for production deployment (Netlify, Vercel, AWS S3, etc.):
```bash
npm run build
```
This will generate a highly optimized, minified bundle in the `/dist` directory.

## Security Notice

IsThisPhish is entirely client-side. The architectural decision to run heuristics and database cross-referencing in the browser ensures the user's querying activity is never logged or stored by a centralized server. 

### About the Project  
This application was developed as a hobby project to explore client-side threat detection and was built with the assistance of AI. It serves as an educational tool for rapid link analysis rather than an enterprise security appliance.

---
*Developed for secure digital exploration.*
