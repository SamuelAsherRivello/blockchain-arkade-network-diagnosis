import { useState } from 'react';
import { OperatorStepComponent } from './components/OperatorStepComponent.jsx';
import { WalletStepComponent } from './components/WalletStepComponent.jsx';
import { OperationStepComponent } from './components/OperationStepComponent.jsx';
import { checkOperator, addWallet } from './wallet.js';
import { arkadeOperations, runOperation } from './operations.js';

const initialOperator = { status: 'idle', message: 'No request has been made yet.' };

export function App() {
  const [operator, setOperator] = useState(initialOperator);
  const [checking, setChecking] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [walletMessage, setWalletMessage] = useState('No wallet is loaded.');
  const [address, setAddress] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [operationResults, setOperationResults] = useState({});
  const [runningOperationId, setRunningOperationId] = useState('');
  const connectionLabel = checking
    ? 'Testing public route'
    : operator.status === 'online'
      ? 'Signet route live'
      : operator.status === 'unavailable'
        ? 'Route needs attention'
        : 'Route not tested';

  async function handleCheck() {
    setChecking(true);
    setOperator({ status: 'checking', message: 'Calling the public Arkade Signet endpoint…' });
    setOperator(await checkOperator());
    setChecking(false);
  }

  async function handleAddWallet() {
    setWalletLoading(true);
    setAddress('');
    setWalletMessage('Checking Signet and deriving the public wallet address…');
    try {
      const wallet = await addWallet(phrase);
      setPhrase('');
      setOperator(wallet.operator);
      setWalletMessage('Wallet added for this page session.');
      setAddress(wallet.arkadeAddress);
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : 'Wallet setup failed.');
    } finally {
      setWalletLoading(false);
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
      <aside className="control-rail">
        <div className="brand-lockup"><span className="brand-signal" aria-hidden="true" /><span>Arkade Signet</span></div>
        <h1>Operator<br />diagnostics</h1>
        <p className="rail-intro">A browser-local read of the public operator. A failed request is evidence from this browser, not an outage declaration.</p>

        <dl className="guardrails">
          <div><dt>Route</dt><dd>Direct browser call</dd></div>
          <div><dt>Network</dt><dd>Signet only</dd></div>
          <div><dt>Wallet mode</dt><dd>Read-only memory</dd></div>
        </dl>

        <p className="rail-note">Work through the runbook in order, or use the public operation reads to isolate the response you need.</p>
      </aside>

      <section className="workspace" aria-label="Arkade Signet diagnostic workspace">
        <header className="workspace-header">
          <div>
            <h2>Runbook</h2>
            <p>Verify the operator, then inspect the public response surface.</p>
          </div>
          <p className={`route-indicator ${operator.status}`}><span aria-hidden="true" />{connectionLabel}</p>
        </header>

        <div className="steps" aria-label="Arkade Signet diagnostic flow">
          <OperatorStepComponent result={operator} checking={checking} onCheck={handleCheck} />
          <WalletStepComponent
            phrase={phrase}
            message={walletMessage}
            address={address}
            loading={walletLoading}
            onPhraseChange={setPhrase}
            onAddWallet={handleAddWallet}
          />
          <OperationStepComponent
            operations={arkadeOperations}
            results={operationResults}
            runningId={runningOperationId}
            onRun={handleRunOperation}
          />
        </div>
        <footer>This site has no application server and no wallet persistence. Public checks use <code>signet.arkade.sh</code> directly.</footer>
      </section>
    </main>
  );
}
