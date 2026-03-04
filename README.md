# deploycheck

> Catch what breaks production before it breaks.

deploycheck is a CLI tool that validates your local environment against a required environment contract before you push to production.

No more "it works on my machine." No more production failures from missing environment variables or wrong runtime versions.

---

## The Problem

Every developer has pushed code to production and watched it break because of a missing environment variable or a version mismatch. It works locally. It breaks in production. You spend hours debugging something that could have been caught in seconds.

## The Solution

deploycheck reads your `env.manifest.json` file, checks your local `.env` file against it, and tells you exactly what will break before you push a single line of code.

---

## Installation
```bash
npm install -g deploycheck
```

## Quick Start

**Step 1: Create your environment manifest**

Add an `env.manifest.json` file to your project:
```json
{
  "version": "1",
  "runtime": {
    "node": "20"
  },
  "variables": {
    "DATABASE_URL": {
      "required": true,
      "description": "PostgreSQL connection string"
    },
    "REDIS_URL": {
      "required": true,
      "description": "Redis connection string"
    },
    "API_KEY": {
      "required": true,
      "description": "External API key"
    }
  }
}
```

**Step 2: Run the validator**
```bash
deploycheck validate
```

**Step 3: See exactly what is wrong**
```
Running deploycheck...

❌ MISSING VARIABLES (2 found)

   DATABASE_URL   required but missing from .env
   REDIS_URL      required but missing from .env

✅ PASSING (1)

   API_KEY   present

Your environment is not ready for production.
Fix the issues above and run deploycheck again.
```

---

## CI Integration

Add this to your GitHub Actions workflow to block deployments automatically:
```yaml
- name: Install deploycheck
  run: npm install -g .

- name: Run deploycheck
  run: deploycheck validate
```

---

## What it checks

- Missing required environment variables
- Runtime version mismatches between local and manifest

## Coming soon

- VS Code extension with inline warnings
- Auto fix for common issues
- Team dashboard

---

Built for developers who are tired of production surprises.
