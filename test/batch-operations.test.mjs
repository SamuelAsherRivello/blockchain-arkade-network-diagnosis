import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { batchStepIds, clearLastBatch, createBatchState, finishBatch, startNewBatch, transitionBatch } from '../src/batch-state.js';
import { runBatch } from '../src/batch-runner.js';

test('starts monotonic local diagnostic batches with every page operation waiting', () => {
  const empty = createBatchState();
  assert.deepEqual(empty, { lastIssuedId: 0, batches: [] });
  assert.strictEqual(clearLastBatch(empty), empty);

  const first = startNewBatch(empty, 'mutinynet');
  assert.deepEqual(first.batches[0], {
    id: 1,
    network: 'mutinynet',
    status: 'running',
    steps: Object.fromEntries(batchStepIds.map((step) => [step, 'waiting'])),
  });

  const complete = finishBatch(transitionBatch(first, 1, { step: 'balance', status: 'success' }), 1, 'complete');
  assert.equal(clearLastBatch(complete).batches.length, 0);
  assert.strictEqual(clearLastBatch(first), first);
  assert.equal(startNewBatch(complete, 'mutinynet').lastIssuedId, 2);
});

test('runs every wallet-backed page operation in its displayed order', async () => {
  const calls = [];
  const transitions = [];
  const steps = [
    'balance', 'onboarding', 'activity', 'asset-readiness',
    'assets', 'mint', 'contracts', 'create-contract',
  ].map((id) => ({
    id,
    run: async () => { calls.push(id); return { backendReachable: 'yes' }; },
  }));

  const result = await runBatch({ steps, onTransition: (transition) => transitions.push(transition) });

  assert.equal(result, 'complete');
  assert.deepEqual(calls, batchStepIds);
  assert.deepEqual(transitions, batchStepIds.flatMap((step) => [
    { step, status: 'called' },
    { step, status: 'success' },
  ]));
});

test('keeps submitted writes truthful while continuing to later available operations', async () => {
  const calls = [];
  const transitions = [];
  const result = await runBatch({
    steps: [
      { id: 'balance', run: async () => { calls.push('balance'); return { backendReachable: 'yes' }; } },
      { id: 'onboarding', run: async () => { calls.push('onboarding'); return { backendReachable: 'yes', outcome: 'submitted' }; } },
      { id: 'activity', run: async () => { calls.push('activity'); return { backendReachable: 'yes' }; } },
    ],
    onTransition: (transition) => transitions.push(transition),
  });

  assert.equal(result, 'complete');
  assert.deepEqual(calls, ['balance', 'onboarding', 'activity']);
  assert.deepEqual(transitions.at(3), { step: 'onboarding', status: 'submitted' });
});

test('stops before later operations when a result is blocked, unavailable, unknown, or failed', async () => {
  for (const [result, expected] of [
    [{ backendReachable: 'yes', outcome: 'blocked' }, 'blocked'],
    [{ backendReachable: 'no' }, 'failed'],
    [{ backendReachable: 'yes', outcome: 'unknown' }, 'unknown'],
  ]) {
    const calls = [];
    const outcome = await runBatch({
      steps: [
        { id: 'balance', run: async () => { calls.push('balance'); return result; } },
        { id: 'onboarding', run: async () => { calls.push('onboarding'); return { backendReachable: 'yes' }; } },
      ],
      onTransition: () => {},
    });
    assert.equal(outcome, expected);
    assert.deepEqual(calls, ['balance']);
  }
});

test('renders compact, status-marked batch progress in a fixed 300px scrollable field', async () => {
  const [app, component, css] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/BatchOperationsStepComponent.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/style.css', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /<BatchOperationsStepComponent/);
  assert.match(component, /number="04"[\s\S]*title="Batch Operations"/);
  assert.match(app, /number="05"[\s\S]*title="Basic Operations"/);
  assert.match(app, /number="06"[\s\S]*title="Asset Operations"/);
  assert.match(app, /number="07"[\s\S]*title="Contract Operations"/);
  for (const label of ['Check Balance', 'Onboard Balance', 'List Wallet Activity', 'Check Asset Prerequisites', 'List Owned Assets', 'Create and Verify Demo Asset', 'List Contracts', 'Create Demo Contract']) {
    assert.match(component, new RegExp(label));
  }
  assert.match(component, /role="log"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /progressStatusClass/);
  assert.match(component, /progress-entry-success/);
  assert.match(component, /progress-entry-failed/);
  assert.match(component, /icon: '✓'/);
  assert.match(component, /icon: '×'/);
  assert.match(component, /Batch stopped/);
  assert.match(component, /remaining operation/);
  assert.doesNotMatch(component, /not called after the prior operation stopped this batch/);
  assert.match(component, /submitted; awaiting/i);
  assert.match(css, /\.batch-progress[^}]*height:\s*300px/);
  assert.match(css, /\.batch-progress[^}]*overflow-y:\s*scroll/);
  assert.match(css, /\.progress-entry-success[^}]*#c7f36e/);
  assert.match(css, /\.progress-entry-failed[^}]*#ff7b8d/);
});

test('resets local batch markers with the remaining in-memory diagnostics on network change', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /const emptyBatchState = createBatchState\(\)/);
  assert.match(app, /setBatchState\(emptyBatchState\)/);
  assert.ok(app.indexOf('setBatchState(emptyBatchState)') < app.indexOf('setNetwork(nextNetwork)'));
});
