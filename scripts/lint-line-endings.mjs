import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ignoredDirectories = new Set([
  '.cache',
  '.git',
  '.nuxt',
  '.nyc_output',
  'coverage',
  'dist',
  'jspm_packages',
  'lib-cov',
  'node_modules',
]);
const ignoredFiles = new Set(['.DS_Store', '.eslintcache']);
const ignoredFilePatterns = [
  /\.log$/,
  /^npm-debug\.log/,
  /^yarn-debug\.log/,
  /^yarn-error\.log/,
  /^\.pnpm-debug\.log/,
  /^report\.\d+\.\d+\.\d+\.\d+\.json$/,
  /\.pid$/,
  /\.pid\.lock$/,
  /\.seed$/,
  /\.tsbuildinfo$/,
  /\.lcov$/,
  /\.tgz$/,
];
const files = [];

function collectFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (entry.isFile() && (
      ignoredFiles.has(entry.name) ||
      ignoredFilePatterns.some((pattern) => pattern.test(entry.name))
    )) continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(path);
    else if (entry.isFile()) files.push(path);
  }
}

collectFiles('.');

const invalidFiles = [];
let checkedFiles = 0;

for (const file of files) {
  const contents = readFileSync(file);
  if (contents.includes(0)) continue;
  checkedFiles += 1;

  if (contents.includes(13)) {
    invalidFiles.push(relative('.', file).split(sep).join('/'));
  }
}

if (invalidFiles.length > 0) {
  console.error(`Expected LF line endings; found CR characters in:\n${invalidFiles.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`LF line endings verified in ${checkedFiles} files.`);
}
