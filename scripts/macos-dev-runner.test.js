'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const vm = require('node:vm');
const {createDevBundle, stopDevApp} = require('./macos-dev-runner');
const config = require('../src-tauri/tauri.conf.json');

test('bundles the current executable with a distinct macOS development identity', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devman runner '));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const binary = path.join(dir, 'devman & test');
  fs.writeFileSync(binary, 'first build', {mode: 0o755});

  const {bundle, executable} = createDevBundle(binary);
  assert.equal(fs.readFileSync(executable, 'utf8'), 'first build');
  assert.ok(fs.statSync(executable).mode & 0o111);
  const plist = path.join(bundle, 'Contents', 'Info.plist');
  const info = fs.readFileSync(plist, 'utf8');
  assert.ok(info.includes(`<string>${config.identifier}.dev</string>`));
  assert.ok(info.includes('<string>devman &amp; test</string>'));
  if (process.platform === 'darwin') {
    execFileSync('plutil', ['-lint', plist]);
  }

  fs.writeFileSync(binary, 'rebuilt executable');
  assert.deepEqual(createDevBundle(binary), {bundle, executable});
  assert.equal(fs.readFileSync(executable, 'utf8'), 'rebuilt executable');
  assert.equal(fs.readFileSync(binary, 'utf8'), 'rebuilt executable');
});

test('stops only the app bundle recorded by this dev session before relaunching', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devman cleanup '));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const file = path.join(dir, 'state');
  const bundle = path.join(dir, 'Dev App.app');
  fs.writeFileSync(file, bundle);
  const commands = [];
  t.mock.method(require('node:child_process'), 'execFileSync', (command, args) => {
    commands.push([command, args]);
    return args[0] === 'find' ? 'ASN:0x1:\n' : '"pid"=12345\n';
  });
  const kill = t.mock.method(process, 'kill', () => true);

  stopDevApp(file);

  assert.deepEqual(commands, [
    ['lsappinfo', ['find', `bundlepath=${bundle}`]],
    ['lsappinfo', ['info', '-only', 'pid', 'ASN:0x1:']],
  ]);
  assert.deepEqual(kill.mock.calls[0].arguments, [12345, 'SIGTERM']);
  assert.equal(fs.existsSync(file), false);
  stopDevApp(file);
  assert.equal(kill.mock.calls.length, 1);
});

test('launches through LaunchServices with the agent socket and application arguments', () => {
  let launch;
  const module = {exports: {}};
  const mocks = {
    'node:fs': {
      existsSync: () => false,
      mkdirSync() {}, rmSync() {}, copyFileSync() {}, writeFileSync() {},
    },
    'node:path': path.posix,
    'node:child_process': {execFileSync() {}},
    '../src-tauri/tauri.conf.json': config,
  };
  const requireMock = name => mocks[name];
  requireMock.main = module;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'macos-dev-runner.js'), 'utf8'), {
    require: requireMock, module, __dirname: '/project/scripts', console: {log() {}},
    process: {
      argv: ['node', 'runner', '/build/devman', '--app-option'],
      env: {SSH_AUTH_SOCK: '/agent with spaces/agent.sock'},
      execve: (command, args, env) => { launch = {command, args: [...args], env}; },
    },
  });

  assert.equal(launch.command, '/usr/bin/open');
  assert.deepEqual(launch.args, [
    'open', '-W', '-n',
    '--stdout', '/project/target/.macos-dev-app.log',
    '--stderr', '/project/target/.macos-dev-app.log',
    '--env', 'SSH_AUTH_SOCK=/agent with spaces/agent.sock',
    `/build/${config.productName} Dev.app`, '--args', '--app-option',
  ]);
  assert.equal(launch.env.SSH_AUTH_SOCK, '/agent with spaces/agent.sock');
});
