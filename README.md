# TRACE — AI Digital Crime Scene

TRACE is a local-first, browser-based digital investigation workspace for fictional and simulated case data. It is designed for hackathon demos and educational exploration, not for certified forensic acquisition, legal admissibility, or real-world case management.

## Run locally on macOS

1. Install Node.js 20+ from [nodejs.org](https://nodejs.org/) if it is not already installed.
2. Open Terminal and move into this project folder.
3. Install dependencies:

```bash
npm install
```

4. Start the local development server:

```bash
npm run dev
```

5. Open Safari at **http://localhost:3000**.

For a production-style local check, run `npm run build` and then `npm run preview`.

## Optional Nebius Token Factory AI

TRACE works without an API key in transparent demonstration mode. To enable live analysis, copy `.env.example` to `.env`, add a valid Nebius Token Factory key, and keep the key server-side:

```bash
cp .env.example .env
# edit .env and set NEBIUS_API_KEY
npm run dev
```

The browser only calls `POST /api/ai`; the key is read by `server/index.mjs` and never bundled into frontend code. The default route is OpenAI-compatible. Update `NEBIUS_BASE_URL` and `NEBIUS_MODEL` if your Nebius account uses different values. If live analysis is unavailable, TRACE shows clearly labeled deterministic local guidance instead of blocking the workflow or presenting it as a live model answer.

## Local data and file limitations

Cases, notes, evidence metadata, extracted text and entities persist in this browser using localStorage. Use **Reset demo data** to restore the original fictional environment. Uploaded binary files are not sent to the TRACE server: text extraction runs in the browser. Images use Tesseract.js OCR; PDFs use PDF.js text extraction and OCR for pages without embedded text. Tesseract may download its worker and English language data from its configured CDN on first use, so OCR requires internet access unless those assets are configured locally. Extraction is capped at 15 MB per file, the first 30 PDF pages, and 50,000 displayed characters. Supported text formats include TXT, LOG, CSV, JSON, MD, XML and HTML. Unsupported formats show an explicit explanation instead of silently claiming analysis. Hash comparison is available when the user selects the original file again; a matching hash supports integrity comparison but does not prove authenticity. Do not add sensitive real-world material to this demo.

## Evidence processing behavior

- **Images:** OCR extracts visible text when readable. No-text and OCR-failure outcomes are shown separately.
- **PDF:** embedded text is extracted first; pages without embedded text are rendered and passed through OCR. Processing is limited to 30 pages.
- **Text files:** supported text is displayed, with JSON syntax validation warnings when needed.
- **Hash comparison:** choose the original file again to compare its current SHA-256 against the stored full hash.
- **AI:** AI-assisted analysis remains a separate optional workflow; OCR completion does not imply that AI analysis has run.

## Main files

- `src/App.tsx` — workspace behavior, seeded state, CRUD and report generation.
- `src/styles.css` — responsive premium dark command-center interface.
- `server/index.mjs` — Vite dev server plus secure optional AI proxy.
- `public/manus-routes.json` — page route manifest.

## Verification

Run `npm run typecheck` for TypeScript checks and `npm run build` for the production bundle. The app has been designed for Safari-compatible browser APIs and avoids Chrome-only features.
