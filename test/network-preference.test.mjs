import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getArkadeNetwork, operatorInfoUrl } from '../src/detector-core.js';

test('routes Signet and Mutinynet through distinct selected-network endpoints', () => {
  assert.equal(operatorInfoUrl('signet'), 'https://signet.arkade.sh/v1/info');
  assert.equal(operatorInfoUrl('mutinynet'), 'https://mutinynet.arkade.sh/v1/info');
  assert.equal(getArkadeNetwork('mutinynet').label, 'Mutinynet');
});

test('persists only the safe network preference, never wallet recovery data', async () => {
  const [preference, walletSession] = await Promise.all([
    readFile(new URL('../src/network-preference.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/wallet-session-storage.js', import.meta.url), 'utf8'),
  ]);
  assert.match(preference, /localStorage\?\.setItem\(preferenceKey, network\)/);
  assert.doesNotMatch(preference, /phrase|mnemonic|recovery/i);
  assert.doesNotMatch(walletSession, /localStorage|sessionStorage/);
});
