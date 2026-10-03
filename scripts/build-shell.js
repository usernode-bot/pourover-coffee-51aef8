'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

function buildShell(publicDir) {
  let html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const references = [...new Set([...html.matchAll(/(?:src|href)="(\/[^"?]+\.(?:js|css))"/g)]
    .map((match) => match[1]))];
  const files = references.filter((url) => !url.startsWith('/usernode-'));
  const platformAssets = references.filter((url) => url.startsWith('/usernode-'));
  const output = path.join(publicDir, 'build');
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
  const assets = {};
  const aliases = {};
  for (const file of files) {
    const bytes = fs.readFileSync(path.join(publicDir, file.slice(1)));
    const hash = digest(bytes);
    const name = `${hash}.${path.basename(file)}`;
    const url = `/build/assets/${name}`;
    fs.writeFileSync(path.join(output, 'assets', name), bytes);
    assets[url] = hash;
    aliases[file] = url;
    html = html.replaceAll(`"${file}"`, `"${url}"`);
  }
  assets['/index.html'] = digest(html);
  fs.writeFileSync(path.join(output, 'index.html'), html);
  const worker = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
  const release = digest(JSON.stringify(assets) + worker);
  const manifest = { release, assets, aliases, platformAssets };
  fs.writeFileSync(path.join(output, 'sw.js'),
    `self.POUROVER_SHELL = ${JSON.stringify(manifest)};\n${worker}`);
  return manifest;
}

if (require.main === module) buildShell(path.resolve(__dirname, '../public'));
module.exports = { buildShell };
