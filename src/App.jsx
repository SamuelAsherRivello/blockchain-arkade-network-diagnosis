import { useEffect, useRef, useState } from 'react';
import { OperatorStepComponent } from './components/OperatorStepComponent.jsx';
import { WalletStepComponent } from './components/WalletStepComponent.jsx';
import { AssetReadinessOperationComponent } from './components/AssetReadinessOperationComponent.jsx';
import { AccountOperationsStepComponent } from './components/AccountOperationsStepComponent.jsx';
import { NetworkStepComponent } from './components/NetworkStepComponent.jsx';
import { checkAccountBalance, checkOperator, createTestContract, inspectAssetMintReadiness, inspectContracts, listOwnedAssets, listWalletActivity, loginWallet, logoutWallet, mintTestAsset, onboardHalfBalance, restoreWallet } from './wallet.js';
import { createArkadeOperations, runOperation } from './operations.js';
import { arkadeNetworks, getArkadeNetwork } from './detector-core.js';
import { loadNetworkPreference, saveNetworkPreference } from './network-preference.js';

const initialOperator = { status: 'idle', message: 'No request has been made yet.' };

const operationsFor = (network) => {
  const { label } = getArkadeNetwork(network);
  return {
    basic: [
      { id: 'balance', title: 'Check account balance', description: `Read the fresh available, Arkade, and boarding balance for the attached ${label} wallet.`, action: 'Check balance' },
      { id: 'onboard-balance', title: 'Onboard Balance (BTC → Arkade, 50%)', description: `Move the eligible ${label} Bitcoin boarding balance into Arkade, then return 50% to Bitcoin after the first leg confirms.`, action: 'Onboard balance', mutation: true },
      { id: 'activity', title: 'List wallet activity', description: `Read the wallet activity history directly from the live ${label} wallet/indexer path.`, action: 'List activity' },
    ],
    assets: [
      { id: 'assets', title: 'List owned assets', description: `Read asset ownership directly from the live ${label} wallet/indexer path.`, action: 'List owned assets' },
      { id: 'mint', title: 'Create and verify a demo asset', description: 'Issue exactly one non-reissuable Detector Test Asset (DTEST), then read the wallet balance to verify the asset is owned.', action: 'Create demo asset', mutation: true },
    ],
    contracts: [
      { id: 'contracts', title: 'List detected contracts', description: 'Read the attached wallet’s live contract records and their visible virtual outputs.', action: 'List contracts' },
      { id: 'create-contract', title: 'Create demo receive contract', description: 'Create a fresh one-wallet default Arkade receive contract for the attached wallet.', action: 'Create demo contract', mutation: true },
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
  const requestEpoch = useRef(0);
  const selectedNetwork = getArkadeNetwork(network);
  const accountOperations = operationsFor(network);
  const operatorOperations = createArkadeOperations(network);
  const connectionLabel = checking ? 'Testing public route' : operator.status === 'online' ? `${selectedNetwork.label} route live` : operator.status === 'unavailable' ? 'Route needs attention' : 'Route not tested';

  function applyWallet(wallet, message) {
    setPhrase('');
    setOperator(wallet.operator);
    setWalletSession(wallet.session);
    setAddress(wallet.arkadeAddress);
    setBoardingAddress(wallet.boardingAddress);
    setWalletMessage(message);
  }

  function isCurrent(epoch) { return requestEpoch.current === epoch; }

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
    ++requestEpoch.current;
    setNetworkSwitching(true);
    setWalletLoading(true);
    try {
      await logoutWallet(network);
      saveNetworkPreference(nextNetwork);
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

  async function handleRunAccountOperation(operationId) {
    const epoch = requestEpoch.current;
    const operation = [...accountOperations.basic, ...accountOperations.assets, ...accountOperations.contracts].find(({ id }) => id === operationId);
    const runners = { balance: checkAccountBalance, 'onboard-balance': onboardHalfBalance, assets: listOwnedAssets, activity: listWalletActivity, mint: mintTestAsset, contracts: inspectContracts, 'create-contract': createTestContract };
    setRunningAccountOperationId(operationId);
    setAccountResults((current) => ({ ...current, [operationId]: { backendReachable: 'pending', message: `Calling ${operation.title.toLowerCase()}…`, output: '' } }));
    try {
      const result = await runners[operationId](walletSession, network);
      if (!isCurrent(epoch)) return;
      setAccountResults((current) => ({ ...current, [operationId]: result }));
      if (result.backendReachable === 'yes') setOperator({ status: 'online', message: result.message });
    } catch (error) {
      if (!isCurrent(epoch)) return;
      setAccountResults((current) => ({ ...current, [operationId]: { backendReachable: 'no', message: error instanceof Error ? error.message : 'This account operation could not be completed.', output: '' } }));
    } finally { if (isCurrent(epoch)) setRunningAccountOperationId(''); }
  }

  async function handleCheckAssetReadiness() {
    const epoch = requestEpoch.current;
    setCheckingAssetReadiness(true); setAssetReadiness(null);
    try {
      const result = await inspectAssetMintReadiness(walletSession, network);
      if (isCurrent(epoch)) setAssetReadiness(result);
    } catch (error) {
      if (isCurrent(epoch)) setAssetReadiness({ status: 'unavailable', backendReachable: 'no', message: error instanceof Error ? error.message : 'Asset preflight failed.' });
    } finally { if (isCurrent(epoch)) setCheckingAssetReadiness(false); }
  }

  async function handleRunOperation(operationId) {
    const epoch = requestEpoch.current;
    setRunningOperationId(operationId);
    const operation = operatorOperations.find(({ id }) => id === operationId);
    setOperationResults((current) => ({ ...current, [operationId]: { backendReachable: 'pending', message: `Calling ${operation.title.toLowerCase()}…`, output: '' } }));
    try {
      const result = await runOperation(operationId, network);
      if (isCurrent(epoch)) { setOperationResults((current) => ({ ...current, [operationId]: result })); setOperator({ status: result.backendReachable === 'yes' ? 'online' : 'unavailable', message: result.message }); }
    } finally { if (isCurrent(epoch)) setRunningOperationId(''); }
  }

  return (
    <main className="app-frame">
      <header className="masthead">
        <div className="masthead-controls">
          <nav className="resource-links" aria-label="Project resources">
            <a className="resource-link docs-link" href="https://docs.arkadeos.com/" target="_blank" rel="noreferrer" aria-label="Open ArkadeOS documentation"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4.8A2.8 2.8 0 0 1 6.8 2H20v17.2H6.8A2.8 2.8 0 0 0 4 22V4.8Z" /><path d="M4 18.5A2.8 2.8 0 0 1 6.8 15.7H20" /></svg></a>
            <a className="resource-link github-link" href="https://github.com/SamuelAsherRivello/blockchain-arkade-signet-down-detector" target="_blank" rel="noreferrer" aria-label="Open the Blockchain Arkade Signet Down Detector GitHub repository"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 8.36 22.91c.58.11.79-.25.79-.56v-2.02c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.57-.29-5.27-1.29-5.27-5.72 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.19a11.04 11.04 0 0 1 5.77 0c2.2-1.5 3.17-1.19 3.17-1.19.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.44-2.7 5.43-5.28 5.71.42.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg></a>
          </nav>
        </div>
        <div className="masthead-main"><h1>ArkadeOS Network API Diagnostics</h1><p className={`route-indicator ${operator.status}`}><span aria-hidden="true" />{connectionLabel}</p></div>
        <dl className="context-line"><div><dt>Route</dt><dd>Direct browser call</dd></div><div><dt>Network</dt><dd>{selectedNetwork.label}</dd></div><div><dt>Wallet mode</dt><dd>Encrypted browser session</dd></div></dl>
      </header>
      <section className="runbook" aria-label={`Arkade ${selectedNetwork.label} diagnostic workspace`}>
        <header className="runbook-header"><h2>Runbook</h2><p>Choose a test network, verify its operator, then use the matching wallet session for the demo.</p></header>
        <div className="steps" aria-label={`Arkade ${selectedNetwork.label} diagnostic flow`}>
          <NetworkStepComponent network={network} networks={arkadeNetworks} onChange={handleNetworkChange} disabled={networkSwitching || walletLoading} />
          <OperatorStepComponent result={operator} checking={checking} onCheck={handleCheck} operations={operatorOperations} results={operationResults} runningId={runningOperationId} onRun={handleRunOperation} networkLabel={selectedNetwork.label} endpoint={selectedNetwork.operatorUrl} />
          <WalletStepComponent phrase={phrase} message={walletMessage} address={address} boardingAddress={boardingAddress} loading={walletLoading} loggedIn={Boolean(walletSession)} onPhraseChange={setPhrase} onLogin={handleLogin} onLogout={handleLogout} networkLabel={selectedNetwork.label} funding={selectedNetwork.funding} />
          <AccountOperationsStepComponent number="04" title="Basic Operations" detail={`Use fresh ${selectedNetwork.label} wallet reads to check the attached account and its recent activity.`} operations={accountOperations.basic} results={accountResults} runningId={runningAccountOperationId} walletAttached={Boolean(walletSession)} onRun={handleRunAccountOperation} networkLabel={selectedNetwork.label} />
          <AccountOperationsStepComponent number="05" title="Asset Operations" detail={`Create one ${selectedNetwork.label} demo asset and verify that the attached wallet owns it.`} operations={accountOperations.assets} results={accountResults} runningId={runningAccountOperationId} walletAttached={Boolean(walletSession)} onRun={handleRunAccountOperation} networkLabel={selectedNetwork.label} beforeOperations={<AssetReadinessOperationComponent result={assetReadiness} checking={checkingAssetReadiness} walletAttached={Boolean(walletSession)} onCheck={handleCheckAssetReadiness} />} />
          <AccountOperationsStepComponent number="06" title="Contract Operations" detail="Create a one-wallet default receive contract that the attached wallet can fund, then inspect its records." operations={accountOperations.contracts} results={accountResults} runningId={runningAccountOperationId} walletAttached={Boolean(walletSession)} onRun={handleRunAccountOperation} networkLabel={selectedNetwork.label} />
        </div>
      </section>
      <footer>This site has no application server. Wallet login is encrypted in this browser only; public checks use <code>{selectedNetwork.operatorUrl}</code> directly.</footer>
    </main>
  );
}
