import { InMemoryContractRepository, InMemoryWalletRepository, MnemonicIdentity, ReadonlyWallet, Ramps, RestArkProvider, RestIndexerProvider, Wallet } from '@arkade-os/sdk';
import { assetMintReadiness, balanceReadiness, boardingReadiness, defaultNetwork, getArkadeNetwork, normalizeRecoveryPhrase, onboardingAutofix, onboardingFailureMessage, onboardingPlan, testAssetRequest } from './detector-core.js';
import { checkOperator } from './operator.js';
import { clearWalletPhrase, loadWalletPhrase, saveWalletPhrase } from './wallet-session-storage.js';

export { checkOperator } from './operator.js';

const sessionStorageByNetwork = new Map();
const operatorUrl = (network) => getArkadeNetwork(network).operatorUrl;
const storage = (network) => {
  if (!sessionStorageByNetwork.has(network)) {
    sessionStorageByNetwork.set(network, { walletRepository: new InMemoryWalletRepository(), contractRepository: new InMemoryContractRepository() });
  }
  return sessionStorageByNetwork.get(network);
};
const unavailable = (message, output = '') => ({ backendReachable: 'no', message, output });
const reachableButBlocked = (message, output = '') => ({ backendReachable: 'yes', message, output });

export function boundedRead(read, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
  });
  return Promise.race([Promise.resolve().then(read), timeout]).finally(() => clearTimeout(timeoutId));
}

function ensureSession(session, network) {
  if (!session?.identity || !session?.readonlyIdentity) throw new Error('Attach a wallet for this page session first.');
  if (session.network !== network) throw new Error('The attached wallet belongs to the previously selected network. Log in again for this network.');
}

async function readonlyWallet(session, network) {
  ensureSession(session, network);
  return ReadonlyWallet.create({
    identity: session.readonlyIdentity,
    arkProvider: new RestArkProvider(operatorUrl(network)),
    indexerProvider: new RestIndexerProvider(operatorUrl(network)),
    storage: storage(network),
    watcherConfig: { failsafePollIntervalMs: 60000, reconnectDelayMs: 60000, maxReconnectAttempts: 1 },
  });
}

export async function addWallet(phraseInput, network = defaultNetwork) {
  const phrase = normalizeRecoveryPhrase(phraseInput);
  const operator = await checkOperator(network);
  if (operator.status !== 'online') throw new Error(operator.message);

  let wallet;
  try {
    const identity = MnemonicIdentity.fromMnemonic(phrase, { isMainnet: false });
    const readonlyIdentity = await identity.toReadonly();
    wallet = await ReadonlyWallet.create({
      identity: readonlyIdentity,
      arkProvider: new RestArkProvider(operatorUrl(network)),
      indexerProvider: new RestIndexerProvider(operatorUrl(network)),
      storage: storage(network),
    });
    const arkadeAddress = await wallet.getAddress();
    const boardingAddress = await wallet.getBoardingAddress();
    if (!arkadeAddress || !boardingAddress) throw new Error(`The recovery phrase did not produce usable ${getArkadeNetwork(network).label} wallet addresses.`);
    return { arkadeAddress, boardingAddress, operator, session: { identity, readonlyIdentity, network } };
  } finally {
    await wallet?.dispose();
  }
}

export async function loginWallet(phraseInput, network = defaultNetwork) {
  const phrase = normalizeRecoveryPhrase(phraseInput);
  const wallet = await addWallet(phrase, network);
  await saveWalletPhrase(phrase);
  return wallet;
}

export async function restoreWallet(network = defaultNetwork) {
  const phrase = await loadWalletPhrase();
  return phrase ? addWallet(phrase, network) : null;
}

export async function logoutWallet(network = defaultNetwork) {
  await clearWalletPhrase();
  sessionStorageByNetwork.delete(network);
}

export async function inspectAssetMintReadiness(session, network = defaultNetwork) {
  try {
    const operator = await checkOperator(network);
    if (operator.status !== 'online') return { status: 'unavailable', backendReachable: 'no', message: operator.message };
    const wallet = await readonlyWallet(session, network);
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

export async function onboardFullBalanceForMint(session, network = defaultNetwork) {
  let stage = `preparing the ${getArkadeNetwork(network).label} onboarding request`;
  try {
    ensureSession(session, network);
    const operator = await checkOperator(network);
    if (operator.status !== 'online') return unavailable(operator.message);
    const arkProvider = new RestArkProvider(operatorUrl(network));
    const wallet = await Wallet.create({
      identity: session.identity,
      arkProvider,
      indexerProvider: new RestIndexerProvider(operatorUrl(network)),
      settlementConfig: false,
      storage: storage(network),
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
      if (info.network !== network) return unavailable(`The operator did not confirm ${getArkadeNetwork(network).label} for this onboarding request.`);
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
        message: `The full Bitcoin-to-Arkade first leg was submitted without a Bitcoin change output. Wait for the ${getArkadeNetwork(network).label} batch, then check balance and activity before beginning the separate 50% return leg.`,
        output: JSON.stringify({
          from: `${getArkadeNetwork(network).label} Bitcoin boarding balance`,
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

export async function checkAccountBalance(session, network = defaultNetwork) {
  try {
    const operator = await checkOperator(network);
    if (operator.status !== 'online') return unavailable(operator.message);
    const wallet = await readonlyWallet(session, network);
    try {
      const result = balanceReadiness(wallet.getProviderConnectionState(), await wallet.getBalance());
      if (result.status !== 'ready') return unavailable('The balance indexer did not provide fresh live data; this detector will show balances as unavailable.');
      return {
        backendReachable: 'yes',
        message: `Fresh account balance loaded from the ${getArkadeNetwork(network).label} wallet providers.`,
        output: JSON.stringify(result, null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch { return unavailable('The balance indexer could not provide fresh wallet data; this detector will show balances as unavailable.'); }
}

export async function listOwnedAssets(session, network = defaultNetwork) {
  try {
    const operator = await checkOperator(network);
    if (operator.status !== 'online') return unavailable(operator.message);
    const wallet = await readonlyWallet(session, network);
    try {
      const connection = wallet.getProviderConnectionState();
      const balance = await wallet.getBalance();
      const balanceState = balanceReadiness(connection, balance);
      if (balanceState.status !== 'ready') return unavailable('The asset indexer did not provide fresh live data; this detector will report assets as unavailable.');
      const assets = (balance.assets ?? []).map((asset) => ({ assetId: asset.assetId, amount: asset.amount.toString() }));
      return {
        backendReachable: 'yes',
        message: assets.length ? `Owned assets loaded from the live ${getArkadeNetwork(network).label} indexer.` : `The live ${getArkadeNetwork(network).label} indexer reports no owned assets for this wallet.`,
        output: JSON.stringify({ assetCount: assets.length, assets }, null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch { return unavailable('The asset indexer could not provide fresh wallet data; this detector will report assets as unavailable.'); }
}

export async function listWalletActivity(session, network = defaultNetwork) {
  try {
    const operator = await checkOperator(network);
    if (operator.status !== 'online') return unavailable(operator.message);
    const wallet = await readonlyWallet(session, network);
    try {
      const connection = wallet.getProviderConnectionState();
      if (connection.mode !== 'online' || connection.source !== 'live') return unavailable('The transaction indexer is not live; activity cannot be verified.');
      const activity = await wallet.getActivityHistory();
      return {
        backendReachable: 'yes',
        message: activity.length ? `Wallet activity loaded from the live ${getArkadeNetwork(network).label} providers.` : `The live ${getArkadeNetwork(network).label} providers report no wallet activity.`,
        output: JSON.stringify(activity.map(({ id, amount, createdAt, settled }) => ({ id, amount, createdAt, settled })), null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch { return unavailable('The transaction indexer could not provide fresh wallet activity.'); }
}

export async function mintTestAsset(session, network = defaultNetwork) {
  try {
    ensureSession(session, network);
    const operator = await checkOperator(network);
    if (operator.status !== 'online') return unavailable(operator.message);
    const wallet = await Wallet.create({
      identity: session.identity,
      arkProvider: new RestArkProvider(operatorUrl(network)),
      indexerProvider: new RestIndexerProvider(operatorUrl(network)),
      settlementConfig: false,
      storage: storage(network),
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
      const ownedAsset = (await wallet.getBalance()).assets?.find((asset) => asset.assetId === result.assetId);
      return {
        backendReachable: 'yes',
        message: ownedAsset ? 'Demo asset created and ownership verified in the attached wallet.' : 'Demo asset issuance submitted, but ownership is not visible in the fresh wallet balance yet. Recheck owned assets.',
        output: JSON.stringify({ network, ...testAssetRequest.metadata, issuedAmount: testAssetRequest.amount.toString(), assetId: result.assetId, transactionId: result.arkTxId, ownershipVerified: Boolean(ownedAsset), ownedAmount: ownedAsset?.amount?.toString() ?? null }, null, 2),
      };
    } finally { await wallet.dispose(); }
  } catch { return unavailable('The test asset mint could not be submitted. Check the balance and asset operations for the first unavailable provider.'); }
}

export async function inspectContracts(session, network = defaultNetwork) {
  let wallet;
  try {
    const operator = await checkOperator(network);
    if (operator.status !== 'online') return unavailable(operator.message);
    wallet = await boundedRead(() => readonlyWallet(session, network), 15000, 'Contract wallet setup');
    const { contracts, state } = await boundedRead(async () => {
      const manager = await wallet.getContractManager();
      return { contracts: await manager.getContractsWithVtxos(), state: manager.getSyncState() };
    }, 15000, 'Contract read');
    if (state.mode !== 'online') return unavailable('The contract indexer is degraded; contract data is not fresh.');
    return {
      backendReachable: 'yes',
      message: contracts.length ? `Contract records loaded from the live ${getArkadeNetwork(network).label} indexer.` : 'No contract records are visible for this wallet.',
      output: JSON.stringify(contracts.map(({ contract, vtxos }) => ({ label: contract.label, type: contract.type, state: contract.state, vtxoCount: vtxos.length })), null, 2),
    };
  } catch (error) {
    return unavailable(error instanceof Error && error.message.startsWith('Contract read timed out')
      ? `The contract indexer did not respond within 15 seconds. Current ${getArkadeNetwork(network).label} contract data is unavailable.`
      : 'The contract indexer could not provide fresh contract data.');
  } finally { await wallet?.dispose(); }
}

export async function createTestContract(session, network = defaultNetwork) {
  let wallet;
  try {
    ensureSession(session, network);
    const operator = await checkOperator(network);
    if (operator.status !== 'online') return unavailable(operator.message);
    wallet = await Wallet.create({
      identity: session.identity,
      arkProvider: new RestArkProvider(operatorUrl(network)),
      indexerProvider: new RestIndexerProvider(operatorUrl(network)),
      settlementConfig: false,
      storage: storage(network),
    });
    const [demo] = await wallet.getNewAddresses({ types: ['default'], forceNew: true });
    return {
      backendReachable: 'yes',
      message: `A one-wallet default receive contract was created for ${getArkadeNetwork(network).label} and is ready to receive funds.`,
      output: JSON.stringify({ network, contractType: demo.contract.type, address: demo.address, script: demo.contract.script, state: demo.contract.state }, null, 2),
    };
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'The demo receive contract could not be created.');
  } finally { await wallet?.dispose(); }
}
