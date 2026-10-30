#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const config = require('../src-tauri/tauri.conf.json');
const stateFile = path.resolve(__dirname, '../target/.macos-dev-app');

function stopDevApp(file = stateFile) {
  if (!fs.existsSync(file)) return;
  const bundle = fs.readFileSync(file, 'utf8');
  const apps = childProcess.execFileSync('lsappinfo', ['find', `bundlepath=${bundle}`], {encoding: 'utf8'}).trim();
  for (const app of apps ? apps.split(/\s+/) : []) {
    const info = childProcess.execFileSync('lsappinfo', ['info', '-only', 'pid', app], {encoding: 'utf8'});
    const pid = info.match(/"pid"=(\d+)/);
    if (pid) {
      try {
        process.kill(Number(pid[1]), 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  }
  fs.unlinkSync(file);
}

function createDevBundle(binary) {
  const name = `${config.productName} Dev`;
  const bundle = path.join(path.dirname(binary), `${name}.app`);
  const executable = path.join(bundle, 'Contents', 'MacOS', path.basename(binary));
  fs.mkdirSync(path.dirname(executable), {recursive: true});
  fs.rmSync(executable, {force: true});
  fs.copyFileSync(binary, executable);
  const info = {
    CFBundleExecutable: path.basename(binary),
    CFBundleIdentifier: `${config.identifier}.dev`,
    CFBundleName: name,
    CFBundleDisplayName: name,
    CFBundlePackageType: 'APPL',
    CFBundleVersion: '1',
  };
  const escape = value => value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]);
  const entries = Object.entries(info).map(([key, value]) =>
    `<key>${key}</key><string>${escape(value)}</string>`).join('\n');
  fs.writeFileSync(path.join(bundle, 'Contents', 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0"><dict>\n${entries}\n</dict></plist>\n`);
  return {bundle, executable};
}

if (require.main === module) {
  stopDevApp();
  const {bundle} = createDevBundle(path.resolve(process.argv[2]));
  childProcess.execFileSync('codesign', ['--force', '--sign', '-', bundle], {stdio: 'inherit'});
  fs.mkdirSync(path.dirname(stateFile), {recursive: true});
  fs.writeFileSync(stateFile, bundle);
  // LaunchServices, not just a bundle on disk, gives 1Password foreground attribution.
  const logFile = `${stateFile}.log`;
  console.log(`App logs: ${logFile}`);
  const args = ['open', '-W', '-n', '--stdout', logFile, '--stderr', logFile];
  if (process.env.SSH_AUTH_SOCK) args.push('--env', `SSH_AUTH_SOCK=${process.env.SSH_AUTH_SOCK}`);
  args.push(bundle, '--args', ...process.argv.slice(3));
  process.execve('/usr/bin/open', args, process.env);
}

module.exports = {createDevBundle, stopDevApp};
