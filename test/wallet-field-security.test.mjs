import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { boundedRead, readWithProviderState } from '../src/wallet.js';

test('reads provider freshness after the wallet read completes', async () => {
  let phase = 'before-read';
  const wallet = {
    getProviderConnectionState: () => ({ mode: phase === 'after-read' ? 'online' : 'degraded', source: phase === 'after-read' ? 'live' : 'repository' }),
  };

  const result = await readWithProviderState(wallet, async () => {
    phase = 'after-read';
    return { value: 'fresh' };
  });

  assert.deepEqual(result, {
    value: { value: 'fresh' },
    connection: { mode: 'online', source: 'live' },
  });
});

test('uses a true password field and does not persist recovery phrases', async () => {
  const [html, source] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/WalletStepComponent.jsx', import.meta.url), 'utf8'),
  ]);
  assert.match(source, /<input[\s\S]*id="recovery-phrase"[\s\S]*type="password"/);
  assert.match(source, /autoComplete="off"/);
  assert.doesNotMatch(`${html}\n${source}`, /localStorage|sessionStorage/);
});

test('shows the selected network boarding address with its matching funding link', async () => {
  const [walletSource, componentSource, appSource] = await Promise.all([
    readFile(new URL('../src/wallet.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/WalletStepComponent.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(walletSource, /getBoardingAddress\(\)/);
  assert.match(componentSource, /\{networkLabel\} Bitcoin boarding address/);
  assert.match(componentSource, /href=\{funding\.url\}/);
  assert.match(componentSource, /target="_blank" rel="noreferrer"/);
  assert.match(componentSource, /Open the selected network faucet/);
  assert.doesNotMatch(componentSource, /boardingAddress.*href|href.*boardingAddress/);
  assert.match(appSource, /funding=\{selectedNetwork\.funding\}/);
});

test('bounds a stalled backend read instead of leaving the UI pending', async () => {
  await assert.rejects(
    boundedRead(() => new Promise(() => {}), 5, 'Contract read'),
    /Contract read timed out after 5ms/,
  );
});

test('returns a clearly marked cached contract snapshot while the indexer reconnects', async () => {
  const source = await readFile(new URL('../src/wallet.js', import.meta.url), 'utf8');

  assert.match(source, /const fresh = state\.mode === 'online';/);
  assert.match(source, /Contract records loaded from cached local state; the contract indexer is degraded, so recent changes may be missing\./);
  assert.doesNotMatch(source, /if \(state\.mode !== 'online'\) return unavailable\('The contract indexer is degraded; contract data is not fresh\.'\);/);
});
