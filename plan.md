# TRACE — Interaction Repair & Moss/Olive Visual Plan

## Product scope
Continue the supplied TRACE website: a local-first digital investigation workspace for fictional/demo records. Preserve its landing page, overview, cases, evidence lab, timeline, entity map, assistant, reports, browser-local persistence, and secure optional AI proxy. This task focuses on repairing incomplete/dead interactions, making action affordances resolve to useful outcomes, applying a coherent moss/olive palette, adding polished motion, and preventing expected offline/browser limitations from becoming blocking UI errors.

## Implementation approach
- Import the user's existing Vite + React 18 + TypeScript application and preserve its source architecture, case data, CRUD flows, server-side optional Nebius proxy, report and route manifest.
- Audit visible controls and affordances. Add useful, keyboard-accessible outcomes to header notifications/profile, workspace selection, settings, keyboard search shortcut, overview metrics, feature/workflow cards and record/graph navigation. Avoid presenting decorative regions as clickable.
- Route application navigation consistently between `/` and `/workspace`; maintain active case context. Repair report popup handling, clipboard copy feedback, empty/error/offline paths, form cancellation and mobile navigation feedback. On AI unavailability, show explicitly labeled local demonstration guidance rather than a blocking failure.
- Reskin existing CSS with an earthy moss/olive palette, warm neutral typography, layered dark forest surfaces, legible status colors, clear focus states and responsive layouts. Use locally available system font stacks to avoid a required remote font request.
- Add a motion system for page/section reveal, staggered panels, interactive elevation, modal/sheet transitions, graph orbit, status pulse and clear action feedback. Respect `prefers-reduced-motion` and avoid continuous movement where it adds no meaning.
- Retain existing package/runtime setup and route contract: Vite + Express dev app on port 3000, `public/manus-routes.json` declares `/` and `/workspace`, optional AI key remains server-side only.

## Project structure
- `src/main.tsx`: React entry point.
- `src/App.tsx`: TRACE page state, navigation, data workflows, popovers, forms, assistant and report actions.
- `src/styles.css`: responsive moss/olive design tokens, component styles, motion and reduced-motion rules.
- `server/index.mjs`: Express/Vite server and optional server-side AI proxy.
- `public/manus-routes.json`: declared landing and workspace routes.
- `index.html`, `package.json`, `README.md`, `.env.example`: metadata, build/run instructions and optional AI configuration.

## Design direction
### Alternative style probabilities
- Botanical field-notes command center — 0.07
- Quiet olive instrument panel — 0.05
- Warm archival intelligence atlas — 0.08

### Chosen style: Botanical field-notes command center
**Design Movement:** editorial field-notes and modern operations-console design, with a restrained nature-derived palette.

**Core Principles:** make actions discoverable; make source and uncertainty legible; use earthy surfaces with high-contrast readable type; animate state changes, not noise.

**Color Philosophy:** layered forest-charcoal surfaces provide a calm, premium backdrop; moss and olive carry primary action and verified activity; pale sage supports secondary emphasis; warm parchment and mineral neutrals soften dense forensic data; amber and muted red remain reserved for review and destructive states.

**Layout Paradigm:** preserve the asymmetric command-center shell and practical sidebar; use framed, staggered work surfaces, editorial page headers and compact evidence rails instead of generic centered blocks.

**Signature Elements:** a moss-lit TRACE prism; olive provenance rails and soft chart fills; quiet botanical contour/grid texture on the landing hero.

**Interaction Philosophy:** each visually interactive control must do something clear and reversible; navigation keeps case context, detail surfaces remain inspectable, and user actions receive visible feedback. Keyboard and focus states are first-class.

**Animation:** 180–260ms responsive transitions; spring-like, staggered section reveals; slight lift/depth on actionable cards; concise modal/popover entrances; slow graph orbit and restrained live pulse; no distracting movement; disable or substantially reduce animation under `prefers-reduced-motion`.

**Typography System:** Inter/system sans fallback for interface copy and a system monospace stack for hashes, IDs, timestamps and metadata; compact editorial display hierarchy and small uppercase operational labels.

**Brand Essence:** a calm evidence-first workspace for organizing fictional digital investigations and explaining what remains uncertain; grounded, precise, capable.

**Brand Voice:** direct, observant and human. Example lines: “Keep the signal. Mark the uncertainty.” / “Every hypothesis points back to a source.”

**Wordmark & Logo:** keep the TRACE wordmark with its offset prism/lens mark, recolored in moss and pale sage.

**Signature Brand Color:** deep moss `#73865a`, supported by olive `#a3ad62` and dark forest `#111710`.
