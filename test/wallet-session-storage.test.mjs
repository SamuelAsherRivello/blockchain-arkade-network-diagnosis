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
