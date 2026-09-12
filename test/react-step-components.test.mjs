import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runOperation } from '../src/operations.js';

const component = (name) => readFile(new URL(`../src/components/${name}.jsx`, import.meta.url), 'utf8');

test('renders the diagnostic flow as three React step components', async () => {
  const [app, step, operator, wallet, operations] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    component('StepComponent'),
    component('OperatorStepComponent'),
    component('WalletStepComponent'),
    component('OperationStepComponent'),
  ]);

  assert.match(app, /OperatorStepComponent/);
  assert.match(app, /WalletStepComponent/);
  assert.match(app, /OperationStepComponent/);
  assert.match(step, /export function StepComponent/);
  assert.match(operator, /StepComponent/);
  assert.match(wallet, /StepComponent/);
  assert.match(operations, /StepComponent/);
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

test('lists public Arkade operations and exposes a reachable yes or no verdict', async () => {
  const [operations, componentSource] = await Promise.all([
    readFile(new URL('../src/operations.js', import.meta.url), 'utf8'),
    component('OperationStepComponent'),
  ]);

  assert.match(operations, /operator-info/);
  assert.match(operations, /fee-policy/);
  assert.match(operations, /session-schedule/);
  assert.match(operations, /backendReachable/);
  assert.match(componentSource, /Backend reachable:/);
});
