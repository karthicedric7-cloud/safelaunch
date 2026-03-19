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

function readManifest() {
  const manifestPath = path.join(process.cwd(), 'env.manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('\nNo env.manifest.json found. Run safelaunch init first.\n');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function readEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('\nNo .env file found.\n');
    process.exit(1);
  }
  const envVars = {};
  const duplicates = [];
  const seen = new Set();
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
      envVars[key] = match[2].trim();
    }
  }
  return { envVars, duplicates };
}

function readEnvExample() {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (!fs.existsSync(envExamplePath)) return null;
  const envVars = {};
  const lines = fs.readFileSync(envExamplePath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
  }
  return envVars;
}

function checkRuntime(manifest) {
  if (!manifest.runtime || !manifest.runtime.node) return null;
  const required = String(manifest.runtime.node);
  const actual = process.version.replace('v', '').split('.')[0];
  if (required !== actual) return { required, actual };
  return null;
}

function checkEnvExample(envVars) {
  const example = readEnvExample();
  if (!example) return [];
  const missing = [];
  for (const key of Object.keys(example)) {
    if (!envVars[key]) missing.push(key);
  }
  return missing;
}

function checkDependencyDrift() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const modulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(packagePath)) return null;
  if (!fs.existsSync(modulesPath)) return { notInstalled: true, missing: [] };
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  const missing = [];
  for (const dep of deps) {
    const depPath = path.join(modulesPath, dep);
    if (!fs.existsSync(depPath)) missing.push(dep);
  }
  return { notInstalled: false, missing };
}

function checkPrefixes(envVars, projectType) {
  const warnings = [];
  for (const key of Object.keys(envVars)) {
    if (key === 'NODE_ENV') continue;
    if (projectType === 'vite' && !key.startsWith('VITE_')) {
      warnings.push(key + '   missing VITE_ prefix (won\'t be exposed to client)');
    }
    if (projectType === 'cra' && !key.startsWith('REACT_APP_')) {
      warnings.push(key + '   missing REACT_APP_ prefix (won\'t be exposed to client)');
    }
    if (projectType === 'next' && key.startsWith('NEXT_PUBLIC_') === false) {
      // server-side only — no warning needed
    }
  }
  return warnings;
}

function checkEnvPriority(cwd, projectType) {
  if (projectType !== 'next') return [];
  const warnings = [];
  const fileVars = {};
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
  for (const file of envFiles) {
    const filePath = path.join(cwd, file);
    if (!fs.existsSync(filePath)) continue;
    const vars = {};
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) vars[match[1].trim()] = match[2].trim();
    }
    fileVars[file] = vars;
  }
  if (fileVars['.env'] && fileVars['.env.local']) {
    for (const key of Object.keys(fileVars['.env'])) {
      if (fileVars['.env.local'][key]) {
        warnings.push(key + '   in both .env and .env.local (.env.local takes priority)');
      }
    }
  }
  return warnings;
}

async function validate() {
  console.log('\nRunning safelaunch...\n');

  const cwd = process.cwd();
  const manifest = readManifest();
  const { envVars, duplicates } = readEnv();

  const projectType = manifest.projectType || detectProjectType(cwd);
  const typeLabels = { vite: 'Vite', next: 'Next.js', cra: 'Create React App', node: 'Node.js' };
  console.log('project type: ' + (typeLabels[projectType] || 'Node.js') + '\n');

  const missing = [];
  const empty = [];
  const passing = [];

  for (const [key, val] of Object.entries(manifest.variables || {})) {
    if (val.required && key in envVars && envVars[key] === '') {
      empty.push(key);
    } else if (val.required && !(key in envVars)) {
      missing.push(key);
    } else {
      passing.push(key);
    }
  }

  const runtimeMismatch = checkRuntime(manifest);
  const exampleMissing = checkEnvExample(envVars);
  const drift = checkDependencyDrift();
  const prefixWarnings = checkPrefixes(envVars, projectType);
  const priorityWarnings = checkEnvPriority(cwd, projectType);

  if (runtimeMismatch) {
    console.log('⚠️  RUNTIME MISMATCH\n');
    console.log('   Node required: ' + runtimeMismatch.required);
    console.log('   Node actual:   ' + runtimeMismatch.actual);
    console.log('');
  }

  if (duplicates.length > 0) {
    console.log('⚠️  DUPLICATE VARIABLES (' + duplicates.length + ' found)\n');
    for (const key of duplicates) {
      console.log('   ' + key + '   defined more than once in .env');
    }
    console.log('');
  }

  if (drift) {
    if (drift.notInstalled) {
      console.log('⚠️  DEPENDENCIES NOT INSTALLED\n');
      console.log('   node_modules not found. Run npm install.\n');
    } else if (drift.missing.length > 0) {
      console.log('⚠️  DEPENDENCY DRIFT (' + drift.missing.length + ' found)\n');
      for (const dep of drift.missing) {
        console.log('   ' + dep + '   in package.json but not installed');
      }
      console.log('');
    }
  }

  if (exampleMissing.length > 0) {
    console.log('⚠️  MISSING FROM .env.example (' + exampleMissing.length + ' found)\n');
    for (const key of exampleMissing) {
      console.log('   ' + key + '   in .env.example but missing from .env');
    }
    console.log('');
  }

  if (prefixWarnings.length > 0) {
    console.log('⚠️  PREFIX WARNINGS (' + prefixWarnings.length + ' found)\n');
    for (const w of prefixWarnings) {
      console.log('   ' + w);
    }
    console.log('');
  }

  if (priorityWarnings.length > 0) {
    console.log('⚠️  ENV FILE PRIORITY (' + priorityWarnings.length + ' found)\n');
    for (const w of priorityWarnings) {
      console.log('   ' + w);
    }
    console.log('');
  }

  if (empty.length > 0) {
    console.log('❌ EMPTY VARIABLES (' + empty.length + ' found)\n');
    for (const key of empty) {
      console.log('   ' + key + '   required but empty in .env');
    }
    console.log('');
  }

  if (missing.length > 0) {
    console.log('❌ MISSING VARIABLES (' + missing.length + ' found)\n');
    for (const key of missing) {
      console.log('   ' + key + '   required but missing from .env');
    }
    console.log('');
  }

  if (passing.length > 0) {
    console.log('✅ PASSING (' + passing.length + ')\n');
    for (const key of passing) {
      console.log('   ' + key + '   present');
    }
    console.log('');
  }

  const hasFailed = runtimeMismatch || missing.length > 0 || empty.length > 0 ||
    duplicates.length > 0 || exampleMissing.length > 0 ||
    prefixWarnings.length > 0 || priorityWarnings.length > 0 ||
    (drift && (drift.notInstalled || drift.missing.length > 0));

  if (hasFailed) {
    console.log('Your environment is not ready for production.\n');
    await track('safelaunch_validate_run', {
      project_type: projectType,
      passed: false,
      missing: missing.length,
      empty: empty.length,
      duplicates: duplicates.length,
      runtime_mismatch: !!runtimeMismatch,
      dependency_drift: !!(drift && drift.missing.length > 0),
      prefix_warnings: prefixWarnings.length,
      priority_warnings: priorityWarnings.length
    });
    await shutdown();
    process.exit(1);
  } else {
    console.log('Your environment is ready for production.\n');
    await track('safelaunch_validate_run', {
      project_type: projectType,
      passed: true,
      vars_passing: passing.length
    });
    await shutdown();
  }
}

validate();