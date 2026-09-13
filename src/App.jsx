import { useEffect, useRef, useState } from 'react';
import { OperatorStepComponent } from './components/OperatorStepComponent.jsx';
import { WalletStepComponent } from './components/WalletStepComponent.jsx';
import { AssetReadinessOperationComponent } from './components/AssetReadinessOperationComponent.jsx';
import { AccountOperationsStepComponent } from './components/AccountOperationsStepComponent.jsx';
import { BatchOperationsStepComponent } from './components/BatchOperationsStepComponent.jsx';
import { NetworkStepComponent } from './components/NetworkStepComponent.jsx';
import { checkAccountBalance, checkOperator, createTestContract, inspectAssetMintReadiness, inspectContracts, listOwnedAssets, listWalletActivity, loginWallet, logoutWallet, mintTestAsset, onboardHalfBalance, resetLocalWalletSession, restoreWallet } from './wallet.js';
import { createArkadeOperations, runOperation } from './operations.js';
import { arkadeNetworks, getArkadeNetwork } from './detector-core.js';
import { loadNetworkPreference, saveNetworkPreference } from './network-preference.js';
import { clearLastBatch, createBatchState, finishBatch, startNewBatch, transitionBatch } from './batch-state.js';
import { runBatch } from './batch-runner.js';

const initialOperator = { status: 'idle', message: 'No request has been made yet.' };
const elapsedSecondsSince = (startedAt) => Math.max(0, Math.floor((performance.now() - startedAt) / 1000));
const withElapsedTime = (result, startedAt) => ({ ...result, elapsedSeconds: elapsedSecondsSince(startedAt) });

const operationsFor = (network) => {
  const { label } = getArkadeNetwork(network);
  return {
    basic: [
      { id: 'balance', title: 'Check account balance', description: `Read the fresh available, Arkade, and boarding balance for the attached ${label} wallet.`, action: 'Check balance', docsHref: 'https://docs.arkadeos.com/wallets/operations/checking-balances', docsTooltip: 'Read more about balances' },
      { id: 'onboard-balance', title: 'Onboard Balance (BTC → Arkade, 50%)', description: `Move the eligible ${label} Bitcoin boarding balance into Arkade, then return 50% to Bitcoin after the first leg confirms.`, action: 'Onboard balance', mutation: true, docsHref: 'https://docs.arkadeos.com/wallets/advanced/ramps', docsTooltip: 'Read more about onboarding Bitcoin' },
      { id: 'activity', title: 'List wallet activity', description: `Read the wallet activity history directly from the live ${label} wallet/indexer path.`, action: 'List activity', docsHref: 'https://docs.arkadeos.com/wallets/operations/payment-history', docsTooltip: 'Read more about wallet activity' },
    ],
    assets: [
      { id: 'assets', title: 'List owned assets', description: `Read asset ownership directly from the live ${label} wallet/indexer path.`, action: 'List owned assets', docsHref: 'https://docs.arkadeos.com/wallets/operations/assets/check-balance', docsTooltip: 'Read more about asset balances' },
      { id: 'mint', title: 'Create and verify a demo asset', description: 'Issue exactly one non-reissuable Detector Test Asset (DTEST), then read the wallet balance to verify the asset is owned.', action: 'Create demo asset', mutation: true, docsHref: 'https://docs.arkadeos.com/wallets/operations/assets/issue-assets', docsTooltip: 'Read more about issuing assets' },
    ],
    contracts: [
      { id: 'contracts', title: 'List detected contracts', description: 'Read the attached wallet’s live contract records and their visible virtual outputs.', action: 'List contracts', docsHref: 'https://docs.arkadeos.com/contracts/deep-dive', docsTooltip: 'Read more about Arkade contracts' },
      { id: 'create-contract', title: 'Create demo receive contract', description: 'Create a fresh one-wallet default Arkade receive contract for the attached wallet.', action: 'Create demo contract', mutation: true, docsHref: 'https://docs.arkadeos.com/wallets/operations/receiving-payments', docsTooltip: 'Read more about receiving payments' },
    ],
  };
};

export function App() {
  const [network, setNetwork] = useState(loadNetworkPreference);
  const [operator, setOperator] = useState(initialOperator);
  const [checking, setChecking] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [walletMessage, setWalletMessage] = useState('No wallet is loaded.');
  const [address, setAddress] = useState('');
  const [boardingAddress, setBoardingAddress] = useState('');
  const [walletSession, setWalletSession] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [networkSwitching, setNetworkSwitching] = useState(false);
  const [assetReadiness, setAssetReadiness] = useState(null);
  const [checkingAssetReadiness, setCheckingAssetReadiness] = useState(false);
  const [operationResults, setOperationResults] = useState({});
  const [runningOperationId, setRunningOperationId] = useState('');
  const [accountResults, setAccountResults] = useState({});
  const [runningAccountOperationId, setRunningAccountOperationId] = useState('');
  const batchStateRef = useRef(createBatchState());
  const batchRunningRef = useRef(false);
  const [batchState, setBatchState] = useState(batchStateRef.current);
  const requestEpoch = useRef(0);
  const selectedNetwork = getArkadeNetwork(network);
  const accountOperations = operationsFor(network);
  const operatorOperations = createArkadeOperations(network);

  function applyWallet(wallet, message) {
    setPhrase('');
    setOperator(wallet.operator);
    setWalletSession(wallet.session);
    setAddress(wallet.arkadeAddress);
    setBoardingAddress(wallet.boardingAddress);
    setWalletMessage(message);
  }

  function commitBatchState(next) {
    batchStateRef.current = next;
    setBatchState(next);
  }

  function isCurrent(epoch) { return requestEpoch.current === epoch; }

  function startPendingResult(setResults, operationId, message, startedAt) {
    const updatePending = () => setResults((current) => ({
      ...current,
      [operationId]: { backendReachable: 'pending', elapsedSeconds: elapsedSecondsSince(startedAt), message, output: '' },
    }));
    updatePending();
    const timerId = window.setInterval(updatePending, 250);
    return () => window.clearInterval(timerId);
  }

  useEffect(() => {
    let active = true;
    const epoch = ++requestEpoch.current;
    setWalletLoading(true);
    setWalletMessage(`Restoring encrypted local ${selectedNetwork.label} wallet session…`);
    void restoreWallet(network).then((wallet) => {
      if (!active || !isCurrent(epoch)) return;
      if (wallet) applyWallet(wallet, `Wallet restored for this ${selectedNetwork.label} browser session.`);
      else setWalletMessage(`No ${selectedNetwork.label} wallet is logged in.`);
    }).catch(() => {
      if (active && isCurrent(epoch)) setWalletMessage('The saved wallet session could not be restored. Log in again or log out to remove it.');
    }).finally(() => { if (active && isCurrent(epoch)) setWalletLoading(false); });
    return () => { active = false; };
  }, [network, selectedNetwork.label]);

  async function handleNetworkChange(nextNetwork) {
    if (nextNetwork === network || networkSwitching) return;
    if (walletSession && !window.confirm('Are you sure?\n\nChanging networks will log you out of your wallet.')) return;
    ++requestEpoch.current;
    setNetworkSwitching(true);
    setWalletLoading(true);
    try {
      await logoutWallet(network);
      saveNetworkPreference(nextNetwork);
      const emptyBatchState = createBatchState();
      batchStateRef.current = emptyBatchState; setBatchState(emptyBatchState);
      setPhrase(''); setAddress(''); setBoardingAddress(''); setWalletSession(null); setAssetReadiness(null); setOperationResults({}); setAccountResults({}); setRunningOperationId(''); setRunningAccountOperationId(''); setChecking(false); setCheckingAssetReadiness(false); setOperator(initialOperator);
      setNetwork(nextNetwork);
      setWalletMessage(`Network changed to ${getArkadeNetwork(nextNetwork).label}. Log in a wallet for this network.`);
    } catch {
      setWalletMessage('The prior encrypted local wallet session could not be removed. The network was not changed.');
    } finally { setWalletLoading(false); setNetworkSwitching(false); }
  }

  async function handleCheck() {
    const epoch = requestEpoch.current;
    setChecking(true);
    setOperator({ status: 'checking', message: `Calling the public Arkade ${selectedNetwork.label} endpoint…` });
    const result = await checkOperator(network);
    if (isCurrent(epoch)) { setOperator(result); setChecking(false); }
  }

  async function handleLogin() {
    const epoch = requestEpoch.current;
    setWalletLoading(true); setAddress(''); setWalletMessage(`Checking ${selectedNetwork.label} and logging in the wallet…`);
    try {
      const wallet = await loginWallet(phrase, network);
      if (isCurrent(epoch)) applyWallet(wallet, 'Wallet logged in and saved in encrypted browser storage.');
    } catch (error) {
      if (isCurrent(epoch)) setWalletMessage(error instanceof Error ? error.message : 'Wallet setup failed.');
    } finally { if (isCurrent(epoch)) setWalletLoading(false); }
  }

  async function handleLogout() {
    const epoch = requestEpoch.current;
    setWalletLoading(true);
    try {
      await logoutWallet(network);
      if (!isCurrent(epoch)) return;
      setPhrase(''); setAddress(''); setBoardingAddress(''); setWalletSession(null); setAssetReadiness(null); setAccountResults({}); setWalletMessage('Logged out. The encrypted local wallet session was removed.');
    } catch {
      if (isCurrent(epoch)) setWalletMessage('The saved wallet session could not be removed.');
    } finally { if (isCurrent(epoch)) setWalletLoading(false); }
  }

  async function handleResetLocalWalletSession() {
    if (!walletSession || walletLoading) return;
    if (!window.confirm(`Reset this browser's local ${selectedNetwork.label} wallet session?\n\nThis clears only the detector's volatile SDK data. It does not send a transaction, cancel a Signet intent, or change on-chain funds.`)) return;
    const epoch = ++requestEpoch.current;
    setWalletLoading(true);
    setPhrase(''); setAddress(''); setBoardingAddress(''); setWalletSession(null); setAssetReadiness(null); setAccountResults({}); setRunningAccountOperationId('');
    setWalletMessage(`Resetting the local ${selectedNetwork.label} wallet session…`);
    try {
      resetLocalWalletSession(network);
      const wallet = await restoreWallet(network);
      if (!wallet) throw new Error('The encrypted browser wallet session is unavailable.');
      if (isCurrent(epoch)) applyWallet(wallet, `Local ${selectedNetwork.label} wallet session reset and restored. Recheck balance and activity before any other action.`);
    } catch {
      if (isCurrent(epoch)) setWalletMessage('The local wallet session was reset, but it could not be restored. Log in again to reattach this wallet.');
    } finally { if (isCurrent(epoch)) setWalletLoading(false); }
  }

  async function handleRunAccountOperation(operationId) {
    const epoch = requestEpoch.current;
    const startedAt = performance.now();
    const operation = [...accountOperations.basic, ...accountOperations.assets, ...accountOperations.contracts].find(({ id }) => id === operationId);
    const runners = { balance: checkAccountBalance, 'onboard-balance': onboardHalfBalance, assets: listOwnedAssets, activity: listWalletActivity, mint: mintTestAsset, contracts: inspectContracts, 'create-contract': createTestContract };
    setRunningAccountOperationId(operationId);
    const stopPending = startPendingResult(setAccountResults, operationId, `Calling ${operation.title.toLowerCase()}…`, startedAt);
    try {
      const result = await runners[operationId](walletSession, network);
      if (!isCurrent(epoch)) return;
      setAccountResults((current) => ({ ...current, [operationId]: withElapsedTime(result, startedAt) }));
      if (result.backendReachable === 'yes') setOperator({ status: 'online', message: result.message });
    } catch (error) {
      if (!isCurrent(epoch)) return;
      setAccountResults((current) => ({ ...current, [operationId]: withElapsedTime({ backendReachable: 'no', message: error instanceof Error ? error.message : 'This account operation could not be completed.', output: '' }, startedAt) }));
    } finally { stopPending(); if (isCurrent(epoch)) setRunningAccountOperationId(''); }
  }

  async function handleCheckAssetReadiness() {
    const epoch = requestEpoch.current;
    const startedAt = performance.now();
    setCheckingAssetReadiness(true); setAssetReadiness(null);
    try {
      const result = await inspectAssetMintReadiness(walletSession, network);
      if (isCurrent(epoch)) setAssetReadiness(withElapsedTime(result, startedAt));
    } catch (error) {
      if (isCurrent(epoch)) setAssetReadiness(withElapsedTime({ status: 'unavailable', backendReachable: 'no', message: error instanceof Error ? error.message : 'Asset preflight failed.' }, startedAt));
    } finally { if (isCurrent(epoch)) setCheckingAssetReadiness(false); }
  }

  async function handleRunOperation(operationId) {
    const epoch = requestEpoch.current;
    const startedAt = performance.now();
    setRunningOperationId(operationId);
    const operation = operatorOperations.find(({ id }) => id === operationId);
    const stopPending = startPendingResult(setOperationResults, operationId, `Calling ${operation.title.toLowerCase()}…`, startedAt);
    try {
      const result = await runOperation(operationId, network);
      if (isCurrent(epoch)) { const timedResult = withElapsedTime(result, startedAt); setOperationResults((current) => ({ ...current, [operationId]: timedResult })); setOperator({ status: result.backendReachable === 'yes' ? 'online' : 'unavailable', message: result.message }); }
    } catch (error) {
      if (isCurrent(epoch)) setOperationResults((current) => ({ ...current, [operationId]: withElapsedTime({ backendReachable: 'no', message: error instanceof Error ? error.message : 'This operator operation could not be completed.', output: '' }, startedAt) }));
    } finally { stopPending(); if (isCurrent(epoch)) setRunningOperationId(''); }
  }

  async function handleStartNewBatch() {
    if (!walletSession || batchRunningRef.current) return;
    const started = startNewBatch(batchStateRef.current, network);
    const batchId = started.lastIssuedId;
    const epoch = requestEpoch.current;
    batchRunningRef.current = true;
    commitBatchState(started);
    try {
      const outcome = await runBatch({
        steps: [
          { id: 'balance', run: () => checkAccountBalance(walletSession, network) },
          { id: 'onboarding', run: () => onboardHalfBalance(walletSession, network) },
          { id: 'activity', run: () => listWalletActivity(walletSession, network) },
          {
            id: 'asset-readiness',
            run: () => inspectAssetMintReadiness(walletSession, network),
            resultStatus: (result) => (result?.backendReachable === 'yes' && !result.canMint ? 'blocked' : undefined),
          },
          { id: 'assets', run: () => listOwnedAssets(walletSession, network) },
          { id: 'mint', run: () => mintTestAsset(walletSession, network) },
          { id: 'contracts', run: () => inspectContracts(walletSession, network) },
          { id: 'create-contract', run: () => createTestContract(walletSession, network) },
        ],
        shouldContinue: () => isCurrent(epoch),
        onTransition: (transition) => {
          if (isCurrent(epoch)) commitBatchState(transitionBatch(batchStateRef.current, batchId, transition));
        },
      });
      if (isCurrent(epoch)) commitBatchState(finishBatch(batchStateRef.current, batchId, outcome));
    } finally { batchRunningRef.current = false; }
  }

  function handleClearLastBatch() {
    if (batchRunningRef.current) return;
    commitBatchState(clearLastBatch(batchStateRef.current));
  }

  return (
    <main className="app-frame">
      <header className="masthead">
        <div className="masthead-controls">
          <nav className="resource-links" aria-label="Project resources">
            <a className="resource-link docs-link" href="https://docs.arkadeos.com/" target="_blank" rel="noreferrer" aria-label="Open ArkadeOS documentation"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4.8A2.8 2.8 0 0 1 6.8 2H20v17.2H6.8A2.8 2.8 0 0 0 4 22V4.8Z" /><path d="M4 18.5A2.8 2.8 0 0 1 6.8 15.7H20" /></svg><span>Docs</span></a>
            <a className="resource-link github-link" href="https://github.com/SamuelAsherRivello/blockchain-arkade-network-diagnosis" target="_blank" rel="noreferrer" aria-label="Open the Arkade OS Network Diagnostics GitHub repository"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 8.36 22.91c.58.11.79-.25.79-.56v-2.02c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.57-.29-5.27-1.29-5.27-5.72 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.19a11.04 11.04 0 0 1 5.77 0c2.2-1.5 3.17-1.19 3.17-1.19.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.44-2.7 5.43-5.28 5.71.42.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg><span>Source</span></a>
          </nav>
        </div>
        <div className="masthead-main"><h1>ArkadeOS Network API Diagnostics</h1></div>
      </header>
      <section className="diagnostic-workspace" aria-label={`Arkade ${selectedNetwork.label} diagnostic workspace`}>
        <div className="steps" aria-label={`Arkade ${selectedNetwork.label} diagnostic flow`}>
          <NetworkStepComponent network={network} networks={arkadeNetworks} onChange={handleNetworkChange} disabled={networkSwitching || walletLoading} />
          <OperatorStepComponent result={operator} checking={checking} onCheck={handleCheck} operations={operatorOperations} results={operationResults} runningId={runningOperationId} onRun={handleRunOperation} networkLabel={selectedNetwork.label} endpoint={selectedNetwork.operatorUrl} />
          <WalletStepComponent phrase={phrase} message={walletMessage} address={address} boardingAddress={boardingAddress} loading={walletLoading} loggedIn={Boolean(walletSession)} onPhraseChange={setPhrase} onLogin={handleLogin} onLogout={handleLogout} onResetLocalSession={handleResetLocalWalletSession} networkLabel={selectedNetwork.label} funding={selectedNetwork.funding} />
          <BatchOperationsStepComponent batches={batchState.batches} onClearLastBatch={handleClearLastBatch} onStartNewBatch={handleStartNewBatch} networkLabel={selectedNetwork.label} walletAttached={Boolean(walletSession)} />
          <AccountOperationsStepComponent number="05" title="Basic Operations" detail={`Use fresh ${selectedNetwork.label} wallet reads to check the attached account and its recent activity.`} operations={accountOperations.basic} results={accountResults} runningId={runningAccountOperationId} walletAttached={Boolean(walletSession)} onRun={handleRunAccountOperation} networkLabel={selectedNetwork.label} />
          <AccountOperationsStepComponent number="06" title="Asset Operations" detail={`Create one ${selectedNetwork.label} demo asset and verify that the attached wallet owns it.`} operations={accountOperations.assets} results={accountResults} runningId={runningAccountOperationId} walletAttached={Boolean(walletSession)} onRun={handleRunAccountOperation} networkLabel={selectedNetwork.label} beforeOperations={<AssetReadinessOperationComponent result={assetReadiness} checking={checkingAssetReadiness} walletAttached={Boolean(walletSession)} onCheck={handleCheckAssetReadiness} />} />
          <AccountOperationsStepComponent number="07" title="Contract Operations" detail="Create a one-wallet default receive contract that the attached wallet can fund, then inspect its records." operations={accountOperations.contracts} results={accountResults} runningId={runningAccountOperationId} walletAttached={Boolean(walletSession)} onRun={handleRunAccountOperation} networkLabel={selectedNetwork.label} />
        </div>
      </section>
    </main>
  );
}
