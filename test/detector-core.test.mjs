import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecoveryPhrase, operatorResult } from '../src/detector-core.js';

test('normalizes a recovery phrase with one space between every word', () => {
  assert.equal(normalizeRecoveryPhrase('  alpha\n beta   gamma\t'), 'alpha beta gamma');
});

test('rejects an empty recovery phrase without retaining it', () => {
  assert.throws(() => normalizeRecoveryPhrase('   '), /Enter a recovery phrase/);
});

test('marks a non-Signet operator response as unavailable', () => {
  assert.deepEqual(operatorResult({ ok: true, status: 200, info: { network: 'mainnet' } }), {
    status: 'unavailable',
    message: 'Expected Arkade Signet but received mainnet.',
  });
});

test('reports a reachable Signet operator', () => {
  assert.deepEqual(operatorResult({ ok: true, status: 200, info: { network: 'signet' } }), {
    status: 'online',
    message: 'Arkade Signet is reachable.',
  });
});
