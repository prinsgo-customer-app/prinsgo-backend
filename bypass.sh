#!/usr/bin/env node
const { execSync } = require('child_process');
try {
  execSync('git push origin HEAD --force-with-lease', { stdio: 'inherit' });
} catch (e) {
  console.error(e.message);
}
