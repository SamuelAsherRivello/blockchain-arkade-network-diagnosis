import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runOperation } from '../src/operations.js';

const component = (name) => readFile(new URL(`../src/components/${name}.jsx`, import.meta.url), 'utf8');

test('renders the diagnostic flow in workflow order across five React steps', async () => {
  const [app, step, operator, wallet, assetReadiness, accountOperations, operations] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    component('StepComponent'),
    component('OperatorStepComponent'),
    component('WalletStepComponent'),
    component('AssetReadinessOperationComponent'),
    component('AccountOperationsStepComponent'),
    component('OperationListComponent'),
  ]);

  assert.match(app, /OperatorStepComponent/);
  assert.match(app, /WalletStepComponent/);
  assert.match(app, /AccountOperationsStepComponent/);
  assert.doesNotMatch(app, /handleOnboardHalfBalance/);
  assert.match(step, /export function StepComponent/);
  assert.match(operator, /StepComponent/);
  assert.match(wallet, /StepComponent/);
  assert.match(wallet, /Log in/);
  assert.match(wallet, /Log out/);
  assert.doesNotMatch(assetReadiness, /StepComponent/);
  assert.match(assetReadiness, /without Bitcoin change/);
  assert.match(assetReadiness, /receipt-bound recovery before it can submit a 50% route/);
  assert.match(assetReadiness, /no confirmed eligible Bitcoin inputs are available/);
  assert.doesNotMatch(assetReadiness, /onClick=\{onOnboard\}/);
  assert.match(assetReadiness, /Asset indexer reachable:/);
  assert.match(assetReadiness, /Bitcoin boarding route:/);
  assert.match(accountOperations, /number/);
  assert.match(accountOperations, /title/);
  assert.match(accountOperations, /Click to transfer/);
  assert.match(app, /handleMintAutofix/);
  assert.match(operations, /export function OperationListComponent/);
  assert.match(app, /number="03"[\s\S]*title="Basic Operations"/);
  assert.match(app, /number="04"[\s\S]*title="Asset Operations"/);
  assert.match(app, /number="05"[\s\S]*title="Contract Operations"/);
  assert.match(operator, /OperationListComponent/);
});

test('rates a verified Signet response as backend reachable', async () => {
  const result = await runOperation('operator-info', async () => ({
    ok: true,
    status: 200,
    json: async () => ({ network: 'signet', protocol: 1 }),
  }));

  assert.equal(result.backendReachable, 'yes');
  assert.match(result.output, /"network": "signet"/);
});

test('lists operator checks and exposes a reachable yes or no verdict', async () => {
  const [operations, componentSource] = await Promise.all([
    readFile(new URL('../src/operations.js', import.meta.url), 'utf8'),
    component('OperationListComponent'),
  ]);

  assert.match(operations, /operator-info/);
  assert.match(operations, /fee-policy/);
  assert.match(operations, /session-schedule/);
  assert.match(operations, /backendReachable/);
  assert.match(componentSource, /Backend reachable:/);
});
