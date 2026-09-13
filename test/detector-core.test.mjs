import test from 'node:test';
import assert from 'node:assert/strict';
import { arkadeNetworks, assetMintReadiness, balanceReadiness, boardingReadiness, getArkadeNetwork, normalizeRecoveryPhrase, onboardingAutofix, onboardingFailureMessage, onboardingPlan, operatorResult, testAssetRequest } from '../src/detector-core.js';

test('defines one verified operator endpoint and funding source for each supported test network', () => {
  assert.deepEqual(arkadeNetworks, {
    signet: { label: 'Signet', operatorUrl: 'https://signet.arkade.sh', funding: { label: 'Open Signet faucet', url: 'https://signetfaucet.com/' } },
    mutinynet: { label: 'Mutinynet', operatorUrl: 'https://mutinynet.arkade.sh', funding: { label: 'Open Mutinynet faucet', url: 'https://faucet.mutinynet.com/' } },
  });
  assert.equal(getArkadeNetwork('signet').operatorUrl, 'https://signet.arkade.sh');
  assert.equal(getArkadeNetwork('mutinynet').operatorUrl, 'https://mutinynet.arkade.sh');
  assert.equal(getArkadeNetwork('signet').funding.url, 'https://signetfaucet.com/');
  assert.equal(getArkadeNetwork('mutinynet').funding.url, 'https://faucet.mutinynet.com/');
  assert.throws(() => getArkadeNetwork('mainnet'), /Unsupported Arkade test network/);
});

test('normalizes a recovery phrase with one space between every word', () => {
  assert.equal(normalizeRecoveryPhrase('  alpha\n beta   gamma\t'), 'alpha beta gamma');
});

test('rejects an empty recovery phrase without retaining it', () => {
  assert.throws(() => normalizeRecoveryPhrase('   '), /Enter a recovery phrase/);
});

test('marks a response for the wrong selected network as unavailable', () => {
  assert.deepEqual(operatorResult({ ok: true, status: 200, info: { network: 'mainnet' }, expectedNetwork: 'signet' }), {
    status: 'unavailable',
    message: 'Expected Arkade Signet but received mainnet.',
  });
});

test('reports a reachable operator only for the selected network', () => {
  assert.deepEqual(operatorResult({ ok: true, status: 200, info: { network: 'signet' }, expectedNetwork: 'signet' }), {
    status: 'online',
    message: 'Arkade Signet is reachable.',
  });
  assert.deepEqual(operatorResult({ ok: true, status: 200, info: { network: 'mutinynet' }, expectedNetwork: 'mutinynet' }), {
    status: 'online',
    message: 'Arkade Mutinynet is reachable.',
  });
});

test('separates a live asset provider from enough spendable funds to mint', () => {
  assert.deepEqual(assetMintReadiness({ mode: 'online', source: 'live' }, [{ value: 520 }, { value: 480 }], 1000), {
    status: 'ready',
    backendReachable: 'yes',
    spendableVtxoCount: 2,
    spendableSats: 1000,
    minimumSats: 1000,
    canMint: true,
  });
  assert.equal(assetMintReadiness({ mode: 'offline', source: 'cache' }, [], 1000).status, 'unavailable');
});

test('calculates a 50 percent onboarding amount from confirmed Bitcoin boarding funds', () => {
  assert.deepEqual(
    boardingReadiness(
      { mode: 'online', source: 'live' },
      [{ txid: 'large', vout: 0, value: 1000, status: { confirmed: true } }, { txid: 'small', vout: 1, value: 330, status: { confirmed: true } }],
    ),
    {
      status: 'ready',
      backendReachable: 'yes',
      availableSats: 1330,
      amountSats: 665,
      retainedBitcoinSats: 665,
      inputs: [{ txid: 'small', vout: 1, value: 330, status: { confirmed: true } }, { txid: 'large', vout: 0, value: 1000, status: { confirmed: true } }],
    },
  );
  assert.equal(boardingReadiness({ mode: 'online', source: 'live' }, [{ value: 330, status: { confirmed: false } }]).status, 'unavailable');
  assert.equal(
    boardingReadiness({ mode: 'offline', source: 'cache' }, [{ value: 1000, status: { confirmed: true } }], 330, true).status,
    'ready',
  );
});

test('starts a 50 percent target with a full Bitcoin-to-Arkade first leg', () => {
  assert.deepEqual(onboardingPlan({ availableSats: 1330, amountSats: 665, retainedBitcoinSats: 665 }), {
    firstLegAmountSats: 1330,
    targetArkadeSats: 665,
    returnToBitcoinSats: 665,
  });
});

test('makes the mint autofix state the full Bitcoin-to-Arkade amount and next-batch estimate', () => {
  assert.deepEqual(
    onboardingAutofix(
      { availableSats: 200000, amountSats: 100000, retainedBitcoinSats: 100000 },
      { nextEndTime: '1120' },
      1_000_000,
    ),
    { amountSats: 200000, amountBtc: '0.00200000', estimatedMinutes: 2 },
  );
});

test('turns an operator intent failure into a safe no-resubmit diagnostic', () => {
  const message = onboardingFailureMessage('intent cleanup', new Error('INVALID_INTENT_PROOF: no matching intents found for intent proof'));
  assert.match(message, /could not find the matching onboarding intent/i);
  assert.match(message, /Do not submit the same Bitcoin inputs again/i);
  assert.doesNotMatch(message, /INVALID_INTENT_PROOF/);
});

test('reports the exact balance fields only when the wallet read is fresh and live', () => {
  assert.deepEqual(balanceReadiness(
    { mode: 'online', source: 'live' },
    { available: 21, total: 34, boarding: { total: 13 } },
  ), {
    status: 'ready',
    backendReachable: 'yes',
    availableSats: 21,
    totalSats: 34,
    bitcoinSats: 13,
    arkadeSats: 21,
  });
  assert.equal(balanceReadiness({ mode: 'offline', source: 'cache' }, { available: 21, total: 34, boarding: { total: 13 } }).status, 'unavailable');
});

test('uses one fixed, non-reissuable test asset request', () => {
  assert.deepEqual(testAssetRequest, {
    amount: 1n,
    metadata: { ticker: 'DTEST', name: 'Detector Test Asset', decimals: 0 },
  });
});
