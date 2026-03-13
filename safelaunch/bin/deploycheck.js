#!/usr/bin/env node
const path = require('path');
const command = process.argv[2];
if (command === 'validate') {
  require(path.join(__dirname, '../src/validate.js'));
} else if (command === 'init') {
  require(path.join(__dirname, '../src/init.js'));
} else {
  console.log('Usage:');
  console.log('  safelaunch init');
  console.log('  safelaunch validate');
}