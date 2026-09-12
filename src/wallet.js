import { InMemoryContractRepository, InMemoryWalletRepository, MnemonicIdentity, ReadonlyWallet, Ramps, RestArkProvider, RestIndexerProvider, Wallet } from '@arkade-os/sdk';
import { assetMintReadiness, balanceReadiness, boardingReadiness, contractReadiness, normalizeRecoveryPhrase, onboardingAutofix, onboardingFailureMessage, onboardingPlan, testAssetRequest } from './detector-core.js';
import { checkOperator } from './operator.js';
import { clearWalletPhrase, loadWalletPhrase, saveWalletPhrase } from './wallet-session-storage.js';

export { checkOperator } from './operator.js';

const operatorUrl = 'https://signet.arkade.sh';
const storage = () => ({ walletRepository: new InMemoryWalletRepository(), contractRepository: new InMemoryContractRepository() });
const unavailable = (message, output = '') => ({ backendReachable: 'no', message, output });
const reachableButBlocked = (message, output = '') => ({ backendReachable: 'yes', message, output });

export function boundedRead(read, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
  });
  return Promise.race([Promise.resolve().then(read), timeout]).finally(() => clearTimeout(timeoutId));
}

function ensureSession(session) {
  if (!session?.identity || !session?.readonlyIdentity) throw new Error('Attach a wallet for this page session first.');
}

async function readonlyWallet(session) {
  ensureSession(session);
  return ReadonlyWallet.create({
    identity: session.readonlyIdentity,
    arkProvider: new RestArkProvider(operatorUrl),
    indexerProvider: new RestIndexerProvider(operatorUrl),
    storage: storage(),
    watcherConfig: { failsafePollIntervalMs: 60000, reconnectDelayMs: 60000, maxReconnectAttempts: 1 },
  });
}

export async function addWallet(phraseInput) {
  const phrase = normalizeRecoveryPhrase(phraseInput);
  const operator = await checkOperator();
  if (operator.status !== 'online') throw new Error(operator.message);

  let wallet;
  try {
    const identity = MnemonicIdentity.fromMnemonic(phrase, { isMainnet: false });
    const readonlyIdentity = await identity.toReadonly();
    wallet = await ReadonlyWallet.create({
      identity: readonlyIdentity,
      arkProvider: new RestArkProvider(operatorUrl),
      indexerProvider: new RestIndexerProvider(operatorUrl),
      storage: storage(),
    });
    const arkadeAddress = await wallet.getAddress();
    const boardingAddress = await wallet.getBoardingAddress();
    if (!arkadeAddress.startsWith('tark1')) throw new Error('The recovery phrase did not produce a Signet Arkade address.');
    if (!boardingAddress.startsWith('tb1')) throw new Error('The recovery phrase did not produce a Signet Bitcoin boarding address.');
    return { arkadeAddress, boardingAddress, operator, session: { identity, readonlyIdentity } };
  } finally {
    await wallet?.dispose();
  }
}

export async function loginWallet(phraseInput) {
  const phrase = normalizeRecoveryPhrase(phraseInput);
  const wallet = await addWallet(phrase);
  await saveWalletPhrase(phrase);
  return wallet;
}

export async function restoreWallet() {
  const phrase = await loadWalletPhrase();
  return phrase ? addWallet(phrase) : null;
}

export async function logoutWallet() {
  await clearWalletPhrase();
}

export async function inspectAssetMintReadiness(session) {
  try {
    const operator = await checkOperator();
    if (operator.status !== 'online') return { status: 'unavailable', backendReachable: 'no', message: operator.message };
    const wallet = await readonlyWallet(session);
    try {
    const [spendable, boardingUtxos] = await Promise.all([
      wallet.getSpendableVtxos({ withRecoverable: false, withUnrolled: false }),
      wallet.getBoardingUtxos(),
    ]);
    const result = assetMintReadiness(wallet.getProviderConnectionState(), spendable, Number(wallet.dustAmount));
    const boarding = boardingReadiness(wallet.getProviderConnectionState(), boardingUtxos, Number(wallet.dustAmount), true);
    return {
      ...result,
      boarding,
      message: result.status === 'ready'
        ? result.canMint ? 'Fresh asset prerequisites are ready for a mint attempt.' : 'The asset provider is live, but the wallet lacks the minimum spendable balance to mint.'
        : 'The asset indexer did not provide fresh live data; Admin will report assets as unavailable.',
    };
    } finally { await wallet.dispose(); }
  } catch {
    return { status: 'unavailable', backendReachable: 'no', message: 'The asset indexer could not provide fresh wallet data; Admin will report assets as unavailable.' };
  }
}

export async function onboardFullBalanceForMint(session) {
  let stage = 'preparing the Signet onboarding request';
  try {
    ensureSession(session);
    const operator = await checkOperator();
    if (operator.status !== 'online') return unavailable(operator.message);
    const arkProvider = new RestArkProvider(operatorUrl);
    const wallet = await Wallet.create({
      identity: session.identity,
      arkProvider,
      indexerProvider: new RestIndexerProvider(operatorUrl),
      settlementConfig: false,
      storage: storage(),
    });
    try {
      const registerIntent = arkProvider.registerIntent.bind(arkProvider);
      arkProvider.registerIntent = async (...args) => {
        stage = 'registering the operator intent';
        const intentId = await registerIntent(...args);
        stage = 'waiting for the operator batch';
        return intentId;
      };
      const info = await arkProvider.getInfo();
      if (info.network !== 'signet') return unavailable('The operator did not confirm Signet for this onboarding request.');
      if (info.fees.txFeeRate !== '0' || Object.values(info.fees.intentFee).some((fee) => fee !== '' && fee !== '0')) {
        return reachableButBlocked('The operator fee schedule changed. This fixed 50% onboarding action will not submit until its quote is reviewed.');
      }
      const readiness = boardingReadiness(wallet.getProviderConnectionState(), await wallet.getBoardingUtxos(), Number(wallet.dustAmount), true);
      if (readiness.status !== 'ready') {
        return readiness.backendReachable === 'yes'
          ? reachableButBlocked('There are not enough confirmed Bitcoin boarding funds to move 50% into a spendable Arkade VTXO.', JSON.stringify(readiness, null, 2))
          : unavailable('The live wallet providers could not verify confirmed Bitcoin boarding funds.');
      }
      const plan = onboardingPlan(readiness);
      stage = 'building the full Bitcoin-to-Arkade first leg';
      const transactionId = await new Ramps(wallet).onboard(info.fees, readiness.inputs, BigInt(plan.firstLegAmountSats));
      return {
        backendReachable: 'yes',
        message: 'The full Bitcoin-to-Arkade first leg was submitted without a Bitcoin change output. Wait for the Signet batch, then check balance and activity before beginning the separate 50% return leg.',
        output: JSON.stringify({
          from: 'Signet Bitcoin boarding balance',
          to: 'Arkade spendable balance',
          firstLegAmountSats: plan.firstLegAmountSats,
          targetArkadeSats: plan.targetArkadeSats,
          returnToBitcoinSats: plan.returnToBitcoinSats,
          transactionId,
        }, null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch (error) {
    return {
      backendReachable: 'yes',
      outcome: 'unknown',
      message: onboardingFailureMessage(stage, error),
      output: JSON.stringify({ stage, result: 'unknown', nextStep: 'Use Check balance and List activity before any recovery action.' }, null, 2),
    };
  }
}

export async function checkAccountBalance(session) {
  try {
    const operator = await checkOperator();
    if (operator.status !== 'online') return unavailable(operator.message);
    const wallet = await readonlyWallet(session);
    try {
      const result = balanceReadiness(wallet.getProviderConnectionState(), await wallet.getBalance());
      if (result.status !== 'ready') return unavailable('The balance indexer did not provide fresh live data; BIS will show balances as unavailable.');
      return {
        backendReachable: 'yes',
        message: 'Fresh account balance loaded from the Signet wallet providers.',
        output: JSON.stringify(result, null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch { return unavailable('The balance indexer could not provide fresh wallet data; BIS will show balances as unavailable.'); }
}

export async function listOwnedAssets(session) {
  try {
    const operator = await checkOperator();
    if (operator.status !== 'online') return unavailable(operator.message);
    const wallet = await readonlyWallet(session);
    try {
      const connection = wallet.getProviderConnectionState();
      const balance = await wallet.getBalance();
      const balanceState = balanceReadiness(connection, balance);
      if (balanceState.status !== 'ready') return unavailable('The asset indexer did not provide fresh live data; BIS will report assets as unavailable.');
      const assets = (balance.assets ?? []).map((asset) => ({ assetId: asset.assetId, amount: asset.amount.toString() }));
      return {
        backendReachable: 'yes',
        message: assets.length ? 'Owned assets loaded from the live Signet indexer.' : 'The live Signet indexer reports no owned assets for this wallet.',
        output: JSON.stringify({ assetCount: assets.length, assets }, null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch { return unavailable('The asset indexer could not provide fresh wallet data; BIS will report assets as unavailable.'); }
}

export async function listWalletActivity(session) {
  try {
    const operator = await checkOperator();
    if (operator.status !== 'online') return unavailable(operator.message);
    const wallet = await readonlyWallet(session);
    try {
      const connection = wallet.getProviderConnectionState();
      if (connection.mode !== 'online' || connection.source !== 'live') return unavailable('The transaction indexer is not live; activity cannot be verified.');
      const activity = await wallet.getActivityHistory();
      return {
        backendReachable: 'yes',
        message: activity.length ? 'Wallet activity loaded from the live Signet providers.' : 'The live Signet providers report no wallet activity.',
        output: JSON.stringify(activity.map(({ id, amount, createdAt, settled }) => ({ id, amount, createdAt, settled })), null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch { return unavailable('The transaction indexer could not provide fresh wallet activity.'); }
}

export async function mintTestAsset(session) {
  try {
    ensureSession(session);
    const operator = await checkOperator();
    if (operator.status !== 'online') return unavailable(operator.message);
    const wallet = await Wallet.create({
      identity: session.identity,
      arkProvider: new RestArkProvider(operatorUrl),
      indexerProvider: new RestIndexerProvider(operatorUrl),
      settlementConfig: false,
      storage: storage(),
    });
    try {
      const readiness = assetMintReadiness(wallet.getProviderConnectionState(), await wallet.getSpendableVtxos({ withRecoverable: false, withUnrolled: false }), Number(wallet.dustAmount));
      if (!readiness.canMint) {
        const boarding = boardingReadiness(wallet.getProviderConnectionState(), await wallet.getBoardingUtxos(), Number(wallet.dustAmount), operator.status === 'online');
        const autofix = boarding.status === 'ready' ? onboardingAutofix(boarding, operator.info?.scheduledSession) : null;
        return readiness.backendReachable === 'yes'
        ? { ...reachableButBlocked('The asset backend is reachable, but this wallet lacks the verified spendable balance required for a test mint.', JSON.stringify(readiness, null, 2)), autofix }
        : unavailable('The live asset provider is not ready for a test mint.', JSON.stringify(readiness, null, 2));
      }
      const result = await wallet.assetManager.issue(testAssetRequest);
      return {
        backendReachable: 'yes',
        message: 'Test asset mint submitted. Refresh owned assets to verify delivery.',
        output: JSON.stringify({ ...testAssetRequest.metadata, amount: testAssetRequest.amount.toString(), assetId: result.assetId, transactionId: result.arkTxId }, null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch { return unavailable('The test asset mint could not be submitted. Check the balance and asset operations for the first unavailable provider.'); }
}

export async function inspectContracts(session) {
  let wallet;
  try {
    const operator = await checkOperator();
    if (operator.status !== 'online') return unavailable(operator.message);
    wallet = await boundedRead(() => readonlyWallet(session), 15000, 'Contract wallet setup');
    const { contracts, state } = await boundedRead(async () => {
      const manager = await wallet.getContractManager();
      return { contracts: await manager.getContractsWithVtxos(), state: manager.getSyncState() };
    }, 15000, 'Contract read');
    if (state.mode !== 'online') return unavailable('The contract indexer is degraded; contract data is not fresh.');
    return {
      backendReachable: 'yes',
      message: contracts.length ? 'Contract records loaded from the live Signet indexer.' : 'No contract records are visible for this wallet.',
      output: JSON.stringify(contracts.map(({ contract, vtxos }) => ({ label: contract.label, type: contract.type, state: contract.state, vtxoCount: vtxos.length })), null, 2),
    };
  } catch (error) {
    return unavailable(error instanceof Error && error.message.startsWith('Contract read timed out')
      ? 'The contract indexer did not respond within 15 seconds. Current Signet contract data is unavailable.'
      : 'The contract indexer could not provide fresh contract data.');
  } finally { await wallet?.dispose(); }
}

export async function createTestContract(session) {
  const operator = await checkOperator();
  if (operator.status !== 'online') return unavailable(operator.message);
  const readiness = contractReadiness({ player: Boolean(session), game: false, canFund: false });
  return reachableButBlocked(`The operator is reachable. ${readiness.message}`, 'A funded BIS LTO contract requires separately logged-in player and game wallets.');
}
