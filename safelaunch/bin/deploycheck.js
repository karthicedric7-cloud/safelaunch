#!/usr/bin/env node
const path = require('path');
const command = process.argv[2];
const subcommand = process.argv[3];

if (command === 'validate') {
  require(path.join(__dirname, '../src/validate.js'));
} else if (command === 'init') {
  require(path.join(__dirname, '../src/init.js'));
} else if (command === 'hook') {
  const { installHook, uninstallHook } = require(path.join(__dirname, '../src/hook.js'));
  if (subcommand === 'install') {
    installHook();
  } else if (subcommand === 'uninstall') {
    uninstallHook();
  } else {
    console.log('\nUsage:');
    console.log('  safelaunch hook install');
    console.log('  safelaunch hook uninstall\n');
  }
} else {
  console.log('\nUsage:');
  console.log('  safelaunch init');
  console.log('  safelaunch validate');
  console.log('  safelaunch hook install');
  console.log('  safelaunch hook uninstall\n');
}