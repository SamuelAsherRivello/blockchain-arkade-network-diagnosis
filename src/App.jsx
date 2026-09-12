import { useEffect, useState } from 'react';
import { OperatorStepComponent } from './components/OperatorStepComponent.jsx';
import { WalletStepComponent } from './components/WalletStepComponent.jsx';
import { AssetReadinessOperationComponent } from './components/AssetReadinessOperationComponent.jsx';
import { AccountOperationsStepComponent } from './components/AccountOperationsStepComponent.jsx';
import { checkAccountBalance, checkOperator, createTestContract, inspectAssetMintReadiness, inspectContracts, listOwnedAssets, listWalletActivity, loginWallet, logoutWallet, mintTestAsset, onboardFullBalanceForMint, restoreWallet } from './wallet.js';
import { arkadeOperations, runOperation } from './operations.js';

const initialOperator = { status: 'idle', message: 'No request has been made yet.' };
const basicOperations = [
  { id: 'balance', title: 'Check account balance', description: 'Read the fresh available, Arkade, and boarding balance for the attached wallet.', action: 'Check balance' },
  { id: 'activity', title: 'List wallet activity', description: 'Read the wallet activity history directly from the live Signet wallet/indexer path.', action: 'List activity' },
];
const assetOperations = [
  { id: 'assets', title: 'List owned assets', description: 'Read asset ownership directly from the live Signet wallet/indexer path.', action: 'List owned assets' },
  { id: 'mint', title: 'Mint a generic test asset', description: 'Issue exactly one non-reissuable Detector Test Asset (DTEST) with no configurable fields.', action: 'Mint Test Asset', mutation: true },
];
const contractOperations = [
  { id: 'contracts', title: 'List detected contracts', description: 'Read the attached wallet’s live contract records and their visible virtual outputs.', action: 'List contracts' },
  { id: 'create-contract', title: 'Check contract prerequisites', description: 'Check the separately logged-in wallet prerequisites that a funded Arkade Signet contract needs.', action: 'Check contract prerequisites' },
];

export function App() {
  const [operator, setOperator] = useState(initialOperator);
  const [checking, setChecking] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [walletMessage, setWalletMessage] = useState('No wallet is loaded.');
  const [address, setAddress] = useState('');
  const [boardingAddress, setBoardingAddress] = useState('');
  const [walletSession, setWalletSession] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [assetReadiness, setAssetReadiness] = useState(null);
  const [checkingAssetReadiness, setCheckingAssetReadiness] = useState(false);
  const [onboardingResult, setOnboardingResult] = useState(null);
  const [operationResults, setOperationResults] = useState({});
  const [runningOperationId, setRunningOperationId] = useState('');
  const [accountResults, setAccountResults] = useState({});
  const [runningAccountOperationId, setRunningAccountOperationId] = useState('');
  const connectionLabel = checking
    ? 'Testing public route'
    : operator.status === 'online'
      ? 'Signet route live'
      : operator.status === 'unavailable'
        ? 'Route needs attention'
        : 'Route not tested';

  function applyWallet(wallet, message) {
    setPhrase('');
    setOperator(wallet.operator);
    setWalletSession(wallet.session);
    setAddress(wallet.arkadeAddress);
    setBoardingAddress(wallet.boardingAddress);
    setWalletMessage(message);
  }

  useEffect(() => {
    let active = true;
    setWalletLoading(true);
    setWalletMessage('Restoring encrypted local wallet session…');
    void restoreWallet().then((wallet) => {
      if (!active) return;
      if (wallet) applyWallet(wallet, 'Wallet restored for this browser session.');
      else setWalletMessage('No wallet is logged in.');
    }).catch(() => {
      if (active) setWalletMessage('The saved wallet session could not be restored. Log in again or log out to remove it.');
    }).finally(() => { if (active) setWalletLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleCheck() {
    setChecking(true);
    setOperator({ status: 'checking', message: 'Calling the public Arkade Signet endpoint…' });
    setOperator(await checkOperator());
    setChecking(false);
  }

  async function handleLogin() {
    setWalletLoading(true);
    setAddress('');
    setWalletMessage('Checking Signet and logging in the wallet…');
    try {
      applyWallet(await loginWallet(phrase), 'Wallet logged in and saved in encrypted browser storage.');
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : 'Wallet setup failed.');
    } finally {
      setWalletLoading(false);
    }
  }

  async function handleLogout() {
    setWalletLoading(true);
    try {
      await logoutWallet();
      setPhrase('');
      setAddress('');
      setBoardingAddress('');
      setWalletSession(null);
      setAssetReadiness(null);
      setOnboardingResult(null);
      setAccountResults({});
      setWalletMessage('Logged out. The encrypted local wallet session was removed.');
    } catch {
      setWalletMessage('The saved wallet session could not be removed.');
    } finally { setWalletLoading(false); }
  }

  async function handleRunAccountOperation(operationId) {
    const operation = [...basicOperations, ...assetOperations, ...contractOperations].find(({ id }) => id === operationId);
    const runners = {
      balance: checkAccountBalance,
      assets: listOwnedAssets,
      activity: listWalletActivity,
      mint: mintTestAsset,
      contracts: inspectContracts,
      'create-contract': createTestContract,
    };
    setRunningAccountOperationId(operationId);
    setAccountResults((current) => ({ ...current, [operationId]: { backendReachable: 'pending', message: `Calling ${operation.title.toLowerCase()}…`, output: '' } }));
    try {
      const result = await runners[operationId](walletSession);
      setAccountResults((current) => ({ ...current, [operationId]: result }));
      if (result.backendReachable === 'yes') setOperator({ status: 'online', message: result.message });
    } catch (error) {
      setAccountResults((current) => ({
        ...current,
        [operationId]: {
          backendReachable: 'no',
          message: error instanceof Error ? error.message : 'This account operation could not be completed.',
          output: '',
        },
      }));
    } finally {
      setRunningAccountOperationId('');
    }
  }

  async function handleCheckAssetReadiness() {
    setCheckingAssetReadiness(true);
    setAssetReadiness(null);
    try {
      setAssetReadiness(await inspectAssetMintReadiness(walletSession));
    } catch (error) {
      setAssetReadiness({ status: 'unavailable', backendReachable: 'no', message: error instanceof Error ? error.message : 'Asset preflight failed.' });
    } finally {
      setCheckingAssetReadiness(false);
    }
  }

  async function handleMintAutofix() {
    setRunningAccountOperationId('mint-autofix');
    const pending = { backendReachable: 'pending', message: 'Submitting the full confirmed Signet Bitcoin balance to Arkade…', output: '' };
    setOnboardingResult(pending);
    setAccountResults((current) => ({ ...current, mint: pending }));
    try {
      const result = await onboardFullBalanceForMint(walletSession);
      setOnboardingResult(result);
      setAccountResults((current) => ({ ...current, mint: result }));
    } finally {
      setRunningAccountOperationId('');
    }
  }

  async function handleRunOperation(operationId) {
    setRunningOperationId(operationId);
    const operation = arkadeOperations.find(({ id }) => id === operationId);
    setOperationResults((current) => ({
      ...current,
      [operationId]: { backendReachable: 'pending', message: `Calling ${operation.title.toLowerCase()}…`, output: '' },
    }));
    try {
      const result = await runOperation(operationId);
      setOperationResults((current) => ({ ...current, [operationId]: result }));
      setOperator({ status: result.backendReachable === 'yes' ? 'online' : 'unavailable', message: result.message });
    } finally {
      setRunningOperationId('');
    }
  }

  return (
    <main className="app-frame">
      <header className="masthead">
        <div className="brand-lockup">
          <div className="brand-name"><span className="brand-signal" aria-hidden="true" /><span>Arkade Signet</span></div>
          <a
            className="github-link"
            href="https://github.com/SamuelAsherRivello/blockchain-arkade-signet-down-detector"
            target="_blank"
            rel="noreferrer"
            aria-label="Open the Blockchain Arkade Signet Down Detector GitHub repository"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 8.36 22.91c.58.11.79-.25.79-.56v-2.02c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.57-.29-5.27-1.29-5.27-5.72 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.19a11.04 11.04 0 0 1 5.77 0c2.2-1.5 3.17-1.19 3.17-1.19.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.44-2.7 5.43-5.28 5.71.42.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg>
          </a>
        </div>
        <div className="masthead-main">
          <div>
            <h1>Operator diagnostics</h1>
            <p className="masthead-intro">A browser-local read of the public operator. A failed request is evidence from this browser, not an outage declaration.</p>
          </div>
          <p className={`route-indicator ${operator.status}`}><span aria-hidden="true" />{connectionLabel}</p>
        </div>
        <dl className="context-line">
          <div><dt>Route</dt><dd>Direct browser call</dd></div>
          <div><dt>Network</dt><dd>Signet only</dd></div>
          <div><dt>Wallet mode</dt><dd>Encrypted browser session</dd></div>
        </dl>
      </header>

      <section className="runbook" aria-label="Arkade Signet diagnostic workspace">
        <header className="runbook-header">
          <h2>Runbook</h2>
          <p>Verify the operator, then inspect the public response surface.</p>
        </header>
        <div className="steps" aria-label="Arkade Signet diagnostic flow">
          <OperatorStepComponent
            result={operator}
            checking={checking}
            onCheck={handleCheck}
            operations={arkadeOperations}
            results={operationResults}
            runningId={runningOperationId}
            onRun={handleRunOperation}
          />
          <WalletStepComponent
            phrase={phrase}
            message={walletMessage}
          address={address}
          boardingAddress={boardingAddress}
          loading={walletLoading}
          loggedIn={Boolean(walletSession)}
          onPhraseChange={setPhrase}
          onLogin={handleLogin}
          onLogout={handleLogout}
          />
          <AccountOperationsStepComponent
            number="03"
            title="Basic Operations"
            detail="Use fresh Signet wallet reads to check the attached account and its recent activity."
            operations={basicOperations}
            results={accountResults}
            runningId={runningAccountOperationId}
            walletAttached={Boolean(walletSession)}
            onRun={handleRunAccountOperation}
            onAutoFix={handleMintAutofix}
          />
          <AccountOperationsStepComponent
            number="04"
            title="Asset Operations"
            detail="Confirm asset readiness, inspect ownership, and mint only when the attached Signet wallet is ready."
            operations={assetOperations}
            results={accountResults}
            runningId={runningAccountOperationId}
            walletAttached={Boolean(walletSession)}
            onRun={handleRunAccountOperation}
            onAutoFix={handleMintAutofix}
            beforeOperations={<AssetReadinessOperationComponent
              result={assetReadiness}
              checking={checkingAssetReadiness}
              onboardingResult={onboardingResult}
              walletAttached={Boolean(walletSession)}
              onCheck={handleCheckAssetReadiness}
            />}
          />
          <AccountOperationsStepComponent
            number="05"
            title="Contract Operations"
            detail="Inspect the attached wallet’s contract records before deliberately checking contract creation prerequisites."
            operations={contractOperations}
            results={accountResults}
            runningId={runningAccountOperationId}
            walletAttached={Boolean(walletSession)}
            onRun={handleRunAccountOperation}
            onAutoFix={handleMintAutofix}
          />
        </div>
      </section>
      <footer>This site has no application server. Wallet login is encrypted in this browser only; public checks use <code>signet.arkade.sh</code> directly.</footer>
    </main>
  );
}
