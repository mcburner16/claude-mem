# TriageFlow AI — Demo App

A polished, interactive sales demo for apartment/multifamily maintenance teams. Shows how a copilot turns vague resident maintenance requests into clarified, prioritized, ready-to-review work orders.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- **Demo only** — no backend required. All state stored in `localStorage`.
- **No real API calls** — triage logic is fully deterministic, client-side.
- Production use would require: Twilio (SMS), database, authentication, vendor config, audit logs, and PMS integration.
- **Human approval must remain required before any real vendor dispatch.**
- Uses HashRouter — works without a server (`/#/dashboard`, etc.)
