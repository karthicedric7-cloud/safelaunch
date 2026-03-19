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

async function init() {
  console.log('\nscanning project for environment variables...\n');
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, 'env.manifest.json');

  if (fs.existsSync(manifestPath)) {
    console.log('env.manifest.json already exists. delete it first.\n');
    await track('safelaunch_init_already_exists');
    await shutdown();
    return;
  }

  const projectType = detectProjectType(cwd);
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'];
  let pattern;
  let typeLabel;

  if (projectType === 'vite') {
    pattern = /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g;
    typeLabel = 'Vite';
  } else if (projectType === 'cra') {
    pattern = /process\.env\.(REACT_APP_[A-Z0-9_]*)/g;
    typeLabel = 'Create React App';
  } else if (projectType === 'next') {
    pattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
    typeLabel = 'Next.js';
  } else {
    pattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
    typeLabel = 'Node.js';
  }

  console.log('detected project type: ' + typeLabel + '\n');
  const found = scanFiles(cwd, extensions, pattern);

  if (found.size === 0) {
    console.log('no environment variables found in your project.\n');
    await track('safelaunch_init_run', { project_type: projectType, vars_found: 0 });
    await shutdown();
    return;
  }

  const variables = {};
  for (const key of [...found].sort()) {
    variables[key] = { required: true, description: '' };
  }

  const manifest = {
    version: '1',
    projectType: projectType,
    runtime: { node: process.version.replace('v', '').split('.')[0] },
    variables
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('found ' + found.size + ' environment variables:\n');
  for (const key of [...found].sort()) {
    console.log('  ' + key);
  }
  console.log('\ncreated env.manifest.json\n');

  await track('safelaunch_init_run', { project_type: projectType, vars_found: found.size });
  await shutdown();
}

init();