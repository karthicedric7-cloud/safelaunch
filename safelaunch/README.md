# safelaunch

> Catch what breaks production before it breaks.

safelaunch is a comprehensive environment validator for Node.js projects. Run it before every push to catch everything that will break production.

## Install

npm install -g safelaunch

## Quick Start

**Step 1: Generate your environment manifest**

safelaunch init

Scans your entire codebase, finds every process.env reference, and generates env.manifest.json automatically.

**Step 2: Validate before you push**

safelaunch validate

## What safelaunch checks

**safelaunch validate runs 7 checks:**

- Missing required environment variables
- Empty required environment variables
- Runtime version mismatch (Node version)
- Duplicate variables in .env
- Dependencies not installed
- Dependency drift (in package.json but not installed)
- Variables in .env.example but missing from .env

## Example output

Running safelaunch...

⚠️  RUNTIME MISMATCH

   Node required: 18
   Node actual:   20

⚠️  DEPENDENCY DRIFT (1 found)

   express   in package.json but not installed

❌ EMPTY VARIABLES (1 found)

   DATABASE_URL   required but empty in .env

❌ MISSING VARIABLES (1 found)

   REDIS_URL   required but missing from .env

✅ PASSING (1)

   API_KEY   present

Your environment is not ready for production.

## Commands

safelaunch init      scan project and generate env.manifest.json automatically
safelaunch validate  run all environment checks before pushing to production

## CI Integration

- name: Install safelaunch
  run: npm install -g safelaunch

- name: Validate environment
  run: safelaunch validate

## Built by Orches

Backend Reliability Infrastructure.
GitHub: https://github.com/karthicedric7-cloud/safelaunch