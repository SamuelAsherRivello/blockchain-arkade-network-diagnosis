import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('offers an explicit 50 percent onboarding action directly after balance', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  const balance = source.indexOf("id: 'balance'");
  const onboard = source.indexOf("id: 'onboard-balance'");
  const activity = source.indexOf("id: 'activity'");
  assert.ok(balance >= 0, 'Check account balance is present');
  assert.ok(onboard > balance, 'Onboard Balance follows Check account balance');
  assert.ok(activity > onboard, 'List wallet activity follows Onboard Balance');
  assert.match(source, /title: 'Onboard Balance \(BTC → Arkade, 50%\)'/);
  assert.match(source, /'onboard-balance': onboardHalfBalance/);
});

test('keeps asset readiness focused on the mint and omits the boarding route explanation', async () => {
  const source = await readFile(new URL('../src/components/AssetReadinessOperationComponent.jsx', import.meta.url), 'utf8');

  assert.match(source, /Warning: There is not enough spendable Arkade balance for this mint operation\./);
  assert.doesNotMatch(source, /Bitcoin boarding route/);
  assert.doesNotMatch(source, /receipt-bound recovery/);
  assert.doesNotMatch(source, /onboardingResult/);
});

test('creates receive contracts with the mnemonic wallet HD allocation stream', async () => {
  const source = await readFile(new URL('../src/wallet.js', import.meta.url), 'utf8');

  assert.match(source, /export async function onboardHalfBalance/);
  assert.match(source, /walletMode: 'hd'/);
  assert.match(source, /wallet\.getNewAddresses\(\{ types: \['default'\], forceNew: true \}\)/);
  assert.match(source, /reachableButBlocked\('This wallet could not allocate a fresh receive contract/);
});

test('submits an explicit onboarding request with the operator fee quote', async () => {
  const source = await readFile(new URL('../src/wallet.js', import.meta.url), 'utf8');

  assert.match(source, /new Ramps\(wallet\)\.onboard\(info\.fees, readiness\.inputs,/);
  assert.doesNotMatch(source, /The operator fee schedule changed\. This fixed 50% onboarding action will not submit until its quote is reviewed\./);
});
