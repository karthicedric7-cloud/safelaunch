# safelaunch

> Stop breaking production over environment variables.

[![npm version](https://badge.fury.io/js/safelaunch.svg)](https://www.npmjs.com/package/safelaunch)

safelaunch validates your environment before every push. It catches missing variables, misconfigurations, and dependency issues before they reach production — in seconds.

Works with **Node.js, Next.js, Vite, and Create React App**. Not just backend. Any JavaScript project.

🌐 [safelaunch.dev](https://karthicedric7-cloud.github.io/Orches)

---

## Privacy & Security

safelaunch runs **entirely on your machine**. It never sends your environment variables, secrets, or any project data to external servers. Your `.env` files stay local. Always.

---

## Two commands. That's it.

**Step 1 — Generate your environment manifest**
```bash
safelaunch init
```

Scans your codebase, finds every environment variable your app uses, and generates an `env.manifest.json` file automatically.

**Step 2 — Validate before you push**
```bash
safelaunch validate
```

Runs 11 checks against your `.env` file and tells you exactly what will break before it does.

---

## Installation
```bash
npm install -g safelaunch
```

---

## Never break a push again — install the git hook
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

## Example output
```
Running safelaunch...

❌ MISSING VARIABLES (2 found)
   DATABASE_URL   required but missing from .env
   REDIS_URL      required but missing from .env

✅ PASSING (9)
   API_KEY        present
   NODE_ENV       present
   ...

Your environment is not ready for production.
Fix the issues above and run safelaunch again.
```

---

## CI Integration

Add this to your GitHub Actions workflow to block deployments automatically:
```yaml
- name: Install safelaunch
  run: npm install -g safelaunch

- name: Validate environment
  run: safelaunch validate
```

---

Built by [Karthi Cedric](https://twitter.com/karthiced) · Part of [Orches](https://karthicedric7-cloud.github.io/Orches)