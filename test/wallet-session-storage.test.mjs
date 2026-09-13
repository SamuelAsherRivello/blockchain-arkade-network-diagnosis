import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('keeps the logged-in phrase in encrypted IndexedDB rather than web storage', async () => {
  const source = await readFile(new URL('../src/wallet-session-storage.js', import.meta.url), 'utf8');
  assert.match(source, /indexedDB\.open/);
  assert.match(source, /AES-GCM/);
  assert.match(source, /extractable/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test('offers a local wallet reset that preserves the encrypted browser session', async () => {
  const [wallet, app, component] = await Promise.all([
    readFile(new URL('../src/wallet.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/WalletStepComponent.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(wallet, /export function resetLocalWalletSession\(network = defaultNetwork\)\s*\{\s*sessionStorageByNetwork\.delete\(network\);\s*\}/);
  assert.match(app, /handleResetLocalWalletSession/);
  assert.match(app, /resetLocalWalletSession\(network\);\s*const wallet = await restoreWallet\(network\)/);
  assert.match(component, /Reset local wallet session/);
  assert.match(component, /onResetLocalSession/);
  assert.doesNotMatch(wallet.match(/export function resetLocalWalletSession[\s\S]*?\n\}/)?.[0] ?? '', /clearWalletPhrase/);
});
