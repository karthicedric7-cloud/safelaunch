const fs = require('fs');
const path = require('path');
const { track, shutdown } = require('./telemetry');

async function installHook() {
  const cwd = process.cwd();
  const gitDir = path.join(cwd, '.git');
  const hooksDir = path.join(gitDir, 'hooks');
  const hookPath = path.join(hooksDir, 'pre-push');

  if (!fs.existsSync(gitDir)) {
    console.log('\nNo .git directory found. Run this from the root of a git project.\n');
    await shutdown();
    return;
  }

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const hookScript = `#!/bin/sh
# safelaunch pre-push hook
echo ""
echo "Running safelaunch validate..."
echo ""
safelaunch validate
if [ $? -ne 0 ]; then
  echo ""
  echo "Push blocked by safelaunch. Fix the issues above before pushing."
  echo ""
  exit 1
fi
`;

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes('safelaunch validate')) {
      console.log('\nsafelaunch hook is already installed.\n');
      await shutdown();
      return;
    }
    // Append to existing hook
    fs.appendFileSync(hookPath, '\n' + hookScript);
    console.log('\nsafelaunch added to existing pre-push hook.\n');
  } else {
    fs.writeFileSync(hookPath, hookScript);
    fs.chmodSync(hookPath, '755');
    console.log('\nsafelaunch pre-push hook installed.\n');
    console.log('safelaunch validate will now run automatically before every git push.\n');
  }

  await track('safelaunch_hook_install');
  await shutdown();
}

async function uninstallHook() {
  const cwd = process.cwd();
  const hookPath = path.join(cwd, '.git', 'hooks', 'pre-push');

  if (!fs.existsSync(hookPath)) {
    console.log('\nNo pre-push hook found.\n');
    await shutdown();
    return;
  }

  const existing = fs.readFileSync(hookPath, 'utf8');
  if (!existing.includes('safelaunch validate')) {
    console.log('\nsafelaunch hook is not installed.\n');
    await shutdown();
    return;
  }

  // Remove safelaunch lines from hook
  const lines = existing.split('\n');
  const filtered = lines.filter(line =>
    !line.includes('safelaunch') &&
    !line.includes('Running safelaunch') &&
    !line.includes('Push blocked by safelaunch') &&
    !line.includes('Fix the issues above')
  );
  fs.writeFileSync(hookPath, filtered.join('\n'));
  console.log('\nsafelaunch pre-push hook removed.\n');

  await track('safelaunch_hook_uninstall');
  await shutdown();
}

module.exports = { installHook, uninstallHook };