export const signetInfoUrl = 'https://signet.arkade.sh/v1/info';

export const testAssetRequest = Object.freeze({
  amount: 1n,
  metadata: Object.freeze({ ticker: 'DTEST', name: 'Detector Test Asset', decimals: 0 }),
});

export function normalizeRecoveryPhrase(value) {
  const phrase = String(value).trim().replace(/\s+/g, ' ');
  if (!phrase) throw new Error('Enter a recovery phrase with spaces between words.');
  return phrase;
}

export function operatorResult({ ok, status, info }) {
  if (!ok) return { status: 'unavailable', message: `Arkade Signet returned HTTP ${status}.` };
  if (info?.network !== 'signet') return { status: 'unavailable', message: `Expected Arkade Signet but received ${info?.network ?? 'an invalid response'}.` };
  return { status: 'online', message: 'Arkade Signet is reachable.' };
}

export function assetMintReadiness(connection, vtxos, minimumSats) {
  const spendable = Array.isArray(vtxos) ? vtxos.filter((vtxo) => Number.isSafeInteger(vtxo?.value) && vtxo.value >= 0) : [];
  const spendableSats = spendable.reduce((total, vtxo) => total + vtxo.value, 0);
  const live = connection?.mode === 'online' && connection?.source === 'live';
  const minimum = Number.isSafeInteger(minimumSats) && minimumSats > 0 ? minimumSats : 0;
  return {
    status: live ? 'ready' : 'unavailable',
    backendReachable: live ? 'yes' : 'no',
    spendableVtxoCount: spendable.length,
    spendableSats,
    minimumSats: minimum,
    canMint: live && minimum > 0 && spendableSats >= minimum,
  };
}

// A half-balance boarding action leaves an equal amount as Bitcoin change.
// Do not include unconfirmed UTXOs in a real signing request.
export function boardingReadiness(connection, boardingUtxos, minimumSats = 330, operatorReachable = false) {
  const live = connection?.mode === 'online' && connection?.source === 'live';
  // Boarding derives its inputs from the Bitcoin provider. A degraded Arkade
  // asset indexer must not hide confirmed Bitcoin funds when /v1/info is live.
  const verifiedRoute = live || operatorReachable;
  const inputs = Array.isArray(boardingUtxos)
    ? boardingUtxos.filter((utxo) => Number.isSafeInteger(utxo?.value) && utxo.value > 0 && utxo.status?.confirmed === true)
      .sort((left, right) => left.value - right.value || String(left.txid).localeCompare(String(right.txid)) || left.vout - right.vout)
    : [];
  const availableSats = inputs.reduce((total, input) => total + input.value, 0);
  const amountSats = Math.floor(availableSats / 2);
  const retainedBitcoinSats = availableSats - amountSats;
  const minimum = Number.isSafeInteger(minimumSats) && minimumSats > 0 ? minimumSats : 330;
  const valid = Number.isSafeInteger(availableSats) && Number.isSafeInteger(amountSats) && Number.isSafeInteger(retainedBitcoinSats);
  if (!verifiedRoute || !valid || amountSats < minimum) return {
    status: 'unavailable', backendReachable: verifiedRoute ? 'yes' : 'no', availableSats, amountSats, retainedBitcoinSats, inputs,
  };
  return {
    status: 'ready', backendReachable: 'yes', availableSats, amountSats, retainedBitcoinSats, inputs,
  };
}

export function onboardingFailureMessage(stage, error) {
  const detail = error instanceof Error ? error.message : '';
  const cause = /no matching intents? found/i.test(detail)
    ? 'The operator could not find the matching onboarding intent during cleanup.'
    : /duplicated input/i.test(detail)
      ? 'The operator reports that one or more selected Bitcoin inputs may still be reserved by an earlier intent.'
      : 'The settlement flow did not return a confirmed Arkade transaction.';
  return `Onboarding did not return a confirmed result during ${stage}. ${cause} Do not submit the same Bitcoin inputs again; inspect balance and activity before any recovery action.`;
}

// Signet rejects an intent that combines Bitcoin boarding inputs with a Bitcoin
// change output. A partial target must therefore start by boarding the selected
// total, with a later, receipt-bound return as a separate settlement.
export function onboardingPlan(readiness) {
  return {
    firstLegAmountSats: readiness.availableSats,
    targetArkadeSats: readiness.amountSats,
    returnToBitcoinSats: readiness.retainedBitcoinSats,
  };
}

export function onboardingAutofix(readiness, scheduledSession, nowMs = Date.now()) {
  const plan = onboardingPlan(readiness);
  const nextEndSeconds = Number(scheduledSession?.nextEndTime);
  const nextEndMs = Number.isSafeInteger(nextEndSeconds) && nextEndSeconds > 0 ? nextEndSeconds * 1000 : 0;
  const estimatedMinutes = nextEndMs > nowMs ? Math.max(1, Math.ceil((nextEndMs - nowMs) / 60000)) : null;
  return {
    amountSats: plan.firstLegAmountSats,
    amountBtc: (plan.firstLegAmountSats / 100000000).toFixed(8),
    estimatedMinutes,
  };
}

// Mirrors BIS/packages/integration/src/arkade/balance.ts. Cached or malformed
// values are intentionally not presented as a valid balance.
export function balanceReadiness(connection, balance) {
  const live = connection?.mode === 'online' && connection?.source === 'live';
  const available = balance?.available;
  const total = balance?.total;
  const bitcoin = balance?.boarding?.total;
  const valid = live
    && Number.isSafeInteger(available) && available >= 0
    && Number.isSafeInteger(total) && total >= available
    && Number.isSafeInteger(bitcoin) && bitcoin >= 0 && bitcoin <= total - available;
  if (!valid) return { status: 'unavailable', backendReachable: 'no' };
  return {
    status: 'ready',
    backendReachable: 'yes',
    availableSats: available,
    totalSats: total,
    bitcoinSats: bitcoin,
    arkadeSats: total - bitcoin,
  };
}

export function contractReadiness({ player, game, canFund }) {
  if (!player || !game) return {
    status: 'unavailable',
    backendReachable: 'no',
    message: 'Attach distinct player and game wallets before creating a contract.',
  };
  if (!canFund) return {
    status: 'unavailable',
    backendReachable: 'yes',
    message: 'The operator is reachable, but the game wallet lacks verified contract funds.',
  };
  return {
    status: 'ready',
    backendReachable: 'yes',
    message: 'Both wallets and the operator are ready for a funded contract.',
  };
}
