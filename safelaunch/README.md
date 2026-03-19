# safelaunch
> Catch what breaks production before it breaks.

safelaunch is a comprehensive environment validator for JavaScript projects. Run it before every push to catch everything that will break production.

Works with Node.js, Next.js, Vite, and Create React App projects. Automatically detects your project type and runs the right checks.

## Install

npm install -g safelaunch

## Two commands. That is it.

**Step 1: Generate your environment manifest**

safelaunch init

Scans your entire codebase, finds every environment variable your app uses, and generates env.manifest.json automatically. Works with process.env and import.meta.env.

**Step 2: Validate before every push**

safelaunch validate

## What safelaunch checks

safelaunch validate runs 11 checks:

1. Missing required environment variables
2. Empty required environment variables
3. Runtime version mismatch (Node version)
4. Duplicate variables in .env
5. Dependencies not installed
6. Dependency drift (in package.json but not installed)
7. Variables in .env.example but missing from .env
8. VITE_ prefix warning (Vite projects — variables without VITE_ won't be exposed to the client)
9. REACT_APP_ prefix warning (CRA projects — variables without REACT_APP_ won't be exposed to the client)
10. NEXT_PUBLIC_ prefix awareness (Next.js — flags variables intended for the client)
11. .env file priority conflicts (Next.js — warns when .env.local overrides .env silently)

## Example output

Running safelaunch...

project type: Next.js

⚠️  RUNTIME MISMATCH

   Node required: 18
   Node actual:   20

⚠️  DEPENDENCY DRIFT (1 found)

   express   in package.json but not installed

⚠️  ENV FILE PRIORITY (1 found)

   DATABASE_URL   in both .env and .env.local (.env.local takes priority)

❌ EMPTY VARIABLES (1 found)

   DATABASE_URL   required but empty in .env

❌ MISSING VARIABLES (1 found)

   REDIS_URL   required but missing from .env

✅ PASSING (1)

   API_KEY   present

Your environment is not ready for production.

## Supported project types

safelaunch automatically detects your project type.

- Node.js       scans process.env
- Next.js       scans process.env, checks NEXT_PUBLIC_ and .env priority
- Vite          scans import.meta.env, checks VITE_ prefix
- React CRA     scans process.env, checks REACT_APP_ prefix

## CI Integration

Add this to your GitHub Actions workflow:

- name: Install safelaunch
  run: npm install -g safelaunch
- name: Validate environment
  run: safelaunch validate

Blocks deployments automatically if any check fails.

## Built by Orches

Deployment Reliability Infrastructure.

GitHub: https://github.com/karthicedric7-cloud/safelaunch
VS Code: https://marketplace.visualstudio.com/items?itemName=Orches.deploycheck-vscode