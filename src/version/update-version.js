const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, 'environment.js'); // adjust if needed
const versionFile = path.resolve(__dirname, 'build-version.json');

// Get today's date
const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const dateString = `${yyyy}.${mm}.${dd}`;

// Track build count per day
let versionData = {};
if (fs.existsSync(versionFile)) {
  versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
}

const buildCount = (versionData[dateString] || 0) + 1;
versionData[dateString] = buildCount;

fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

const version = `${dateString}.${buildCount}`;
console.log('Updating build version to', version);

// Replace version string in environment file
let content = fs.readFileSync(envPath, 'utf8');
content = content.replace(/version: '.*?'/, `version: '${version}'`);
fs.writeFileSync(envPath, content);