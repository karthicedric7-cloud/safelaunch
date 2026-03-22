const fs = require('fs');
const path = require('path');
const { track, shutdown } = require('./telemetry');

function detectProjectType(cwd) {
  if (fs.existsSync(path.join(cwd, 'vite.config.js')) ||
    fs.existsSync(path.join(cwd, 'vite.config.ts'))) {
    return 'vite';
  }
  if (fs.existsSync(path.join(cwd, 'next.config.js')) ||
    fs.existsSync(path.join(cwd, 'next.config.ts'))) {
    return 'next';
  }
  const packagePath = path.join(cwd, 'package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    if (deps['react-scripts']) return 'cra';
  }
  return 'node';
}

function scanFiles(dir, extensions, pattern, found = new Set()) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.git') continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanFiles(full, extensions, pattern, found);
    } else if (extensions.some(ext => item.endsWith(ext))) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        found.add(match[1]);
      }
    }
  }
  return found;
}

function readEnvDetailed(cwd) {
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) return null;
  const envVars = {};
  const duplicates = new Set();
  const seen = new Set();
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
      envVars[key] = val;
    }
  }
  return { envVars, duplicates: [...duplicates] };
}

function checkPrefixes(foundVars, envVars, projectType) {
  const warnings = [];
  for (const key of foundVars) {
    if (key === 'NODE_ENV') continue;
    if (projectType === 'vite' && !key.startsWith('VITE_')) {
      warnings.push(key + '   missing VITE_ prefix (won\'t be exposed to client)');
    }
    if (projectType === 'cra' && !key.startsWith('REACT_APP_')) {
      warnings.push(key + '   missing REACT_APP_ prefix (won\'t be exposed to client)');
    }
  }
  return warnings;
}

function checkDependencies(cwd) {
  const packagePath = path.join(cwd, 'package.json');
  const modulesPath = path.join(cwd, 'node_modules');
  if (!fs.existsSync(packagePath)) return null;
  if (!fs.existsSync(modulesPath)) return { notInstalled: true, missing: [] };
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  const missing = [];
  for (const dep of deps) {
    if (!fs.existsSync(path.join(modulesPath, dep))) missing.push(dep);
  }
  return { notInstalled: false, missing };
}

async function scan() {
  console.log('\nScanning your project...\n');

  const cwd = process.cwd();
  const projectType = detectProjectType(cwd);
  const typeLabels = { vite: 'Vite', next: 'Next.js', cra: 'Create React App', node: 'Node.js' };
  console.log('Detected: ' + typeLabels[projectType] + '\n');

  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'];
  let pattern;

  if (projectType === 'vite') {
    pattern = /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g;
  } else if (projectType === 'cra') {
    pattern = /process\.env\.(REACT_APP_[A-Z0-9_]*)/g;
  } else {
    pattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
  }

  const found = scanFiles(cwd, extensions, pattern);

  if (found.size === 0) {
    console.log('No environment variables found in your codebase.\n');
    await track('safelaunch_scan_run', { project_type: projectType, vars_found: 0 });
    await shutdown();
    return;
  }

  console.log('Found ' + found.size + ' env variables in your codebase\n');

  const result = readEnvDetailed(cwd);

  if (!result) {
    console.log('❌ No .env file found — all variables would be missing.\n');
    for (const key of [...found].sort()) {
      console.log('   ' + key);
    }
    console.log('\nYour next deploy would have failed.\n');
    console.log('Run safelaunch init to lock this in permanently.\n');
    await track('safelaunch_scan_run', { project_type: projectType, vars_found: found.size, missing: found.size, no_env: true });
    await shutdown();
    return;
  }

  const { envVars, duplicates } = result;
  const missing = [];
  const empty = [];
  const present = [];

  for (const key of [...found].sort()) {
    if (!(key in envVars)) {
      missing.push(key);
    } else if (envVars[key] === '') {
      empty.push(key);
    } else {
      present.push(key);
    }
  }

  const prefixWarnings = checkPrefixes(found, envVars, projectType);
  const drift = checkDependencies(cwd);

  let hasFailed = false;

  if (duplicates.length > 0) {
    hasFailed = true;
    console.log('⚠️  DUPLICATE VARIABLES (' + duplicates.length + ' found)\n');
    for (const key of duplicates) {
      console.log('   ' + key + '   defined more than once in .env');
    }
    console.log('');
  }

  if (drift) {
    if (drift.notInstalled) {
      hasFailed = true;
      console.log('⚠️  DEPENDENCIES NOT INSTALLED\n');
      console.log('   node_modules not found. Run npm install.\n');
    } else if (drift.missing.length > 0) {
      hasFailed = true;
      console.log('⚠️  DEPENDENCY DRIFT (' + drift.missing.length + ' found)\n');
      for (const dep of drift.missing) {
        console.log('   ' + dep + '   in package.json but not installed');
      }
      console.log('');
    }
  }

  if (prefixWarnings.length > 0) {
    hasFailed = true;
    console.log('⚠️  PREFIX WARNINGS (' + prefixWarnings.length + ' found)\n');
    for (const w of prefixWarnings) {
      console.log('   ' + w);
    }
    console.log('');
  }

  if (empty.length > 0) {
    hasFailed = true;
    console.log('❌ EMPTY VARIABLES (' + empty.length + ' found)\n');
    for (const key of empty) {
      console.log('   ' + key + '   present but empty in .env');
    }
    console.log('');
  }

  if (missing.length > 0) {
    hasFailed = true;
    console.log('❌ MISSING VARIABLES (' + missing.length + ' found)\n');
    for (const key of missing) {
      console.log('   ' + key + '   missing from .env');
    }
    console.log('');
  }

  if (present.length > 0) {
    console.log('✅ PASSING (' + present.length + ')\n');
    for (const key of present) {
      console.log('   ' + key + '   present');
    }
    console.log('');
  }

  if (hasFailed) {
    console.log('Your next deploy would have failed.\n');
    console.log('Run safelaunch init to lock this in permanently.\n');
  } else {
    console.log('Your project is clean. Nothing would break your next deploy.\n');
    console.log('Run safelaunch init to lock this in permanently.\n');
  }

  await track('safelaunch_scan_run', {
    project_type: projectType,
    vars_found: found.size,
    present: present.length,
    missing: missing.length,
    empty: empty.length,
    duplicates: duplicates.length,
    prefix_warnings: prefixWarnings.length,
    dependency_drift: !!(drift && drift.missing.length > 0)
  });

  await shutdown();
}

scan();