import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatOperationResultSummary } from '../src/operation-result.js';

test('formats a reachable operation result with whole elapsed seconds', () => {
  assert.equal(
    formatOperationResultSummary({ backendReachable: 'yes', elapsedSeconds: 33 }),
    'Output - (Reachable: Yes, Time: 33 secs)',
  );
});

test('formats pending and unavailable operation results consistently', () => {
  assert.equal(
    formatOperationResultSummary({ backendReachable: 'pending', elapsedSeconds: 0 }),
    'Output - (Reachable: Pending, Time: 0 secs)',
  );
  assert.equal(
    formatOperationResultSummary({ backendReachable: 'no', elapsedSeconds: 4.8 }),
    'Output - (Reachable: No, Time: 5 secs)',
  );
});

test('refreshes a pending output with the live elapsed seconds while a request is running', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.match(source, /setInterval\(updatePending, 250\)/);
  assert.match(source, /clearInterval\(timerId\)/);
  assert.match(source, /elapsedSeconds: elapsedSecondsSince\(startedAt\)/);
});
