# safelaunch

> Ship without breaking production ever.

[![npm version](https://badge.fury.io/js/safelaunch.svg)](https://www.npmjs.com/package/safelaunch)

safelaunch validates your environment before every push. Catches missing variables, empty values, duplicates, dependency drift, and prefix misconfigurations — before they reach production.

Works with **Node.js, Next.js, Vite, and Create React App**. Not just backend. Any JavaScript project.

🌐 [orches.dev](https://karthicedric7-cloud.github.io/Orches)

---

## Privacy & Security

safelaunch runs **entirely on your machine**. It never sends your environment variables, secrets, or any project data to external servers. Your `.env` files stay local. Always.

---

## Try it right now — zero setup
```bash
npx safelaunch scan
```

No installation. No config. Just run it in any JavaScript project.

Scans your entire codebase, checks your `.env`, and tells you exactly what would break your next deploy.
```
Scanning your project...

Detected: Next.js

Found 8 env variables in your codebase

⚠️  DUPLICATE VARIABLES (1 found)

   DATABASE_URL   defined more than once in .env

❌ MISSING VARIABLES (2 found)

   NEXTAUTH_SECRET   missing from .env
   STRIPE_SECRET_KEY   missing from .env

✅ PASSING (6)

   API_KEY   present
   NODE_ENV   present
   ...

Your next deploy would have failed.

Run safelaunch init to lock this in permanently.
```

---

## Installation
```bash
npm install -g safelaunch
```

---

## Lock it in permanently

Once you've seen what scan finds, lock it in with two commands:

**Step 1 — Generate your environment manifest**
```bash
safelaunch init
```

Scans your codebase and generates an `env.manifest.json` contract file automatically.

**Step 2 — Validate before every push**
```bash
safelaunch validate
```

Runs 11 checks against your `.env` and tells you exactly what will break before it does.

---

## Never think about it again — install the git hook
```bash
safelaunch hook install
```

Blocks `git push` automatically if validation fails. Set it once, forget about it.

---

## What it checks

1. Missing required variables
2. Empty variables
3. Runtime version mismatch
4. Duplicate variables
5. Dependencies not installed
6. Dependency drift
7. `.env` vs `.env.example` sync
8. `VITE_` prefix validation
9. `REACT_APP_` prefix validation
10. `NEXT_PUBLIC_` awareness
11. `.env` file priority order

---

## CI Integration

Block deployments automatically by adding this to your GitHub Actions workflow:
```yaml
- name: Install safelaunch
  run: npm install -g safelaunch

- name: Validate environment
  run: safelaunch validate
```

---

Built by [Karthi Cedric](https://twitter.com/karthiced) · Part of [Orches](https://karthicedric7-cloud.github.io/Orches)