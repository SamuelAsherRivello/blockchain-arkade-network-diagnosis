import { StepComponent } from './StepComponent.jsx';
import { DocumentationLinkComponent } from './DocumentationLinkComponent.jsx';

const batchOperations = [
  { id: 'balance', label: 'Check Balance' },
  { id: 'onboarding', label: 'Onboard Balance' },
  { id: 'activity', label: 'List Wallet Activity' },
  { id: 'asset-readiness', label: 'Check Asset Prerequisites' },
  { id: 'assets', label: 'List Owned Assets' },
  { id: 'mint', label: 'Create and Verify Demo Asset' },
  { id: 'contracts', label: 'List Contracts' },
  { id: 'create-contract', label: 'Create Demo Contract' },
];

const progressStatusClass = {
  pending: 'progress-entry-pending',
  success: 'progress-entry-success',
  failed: 'progress-entry-failed',
};

function progressEntry(batch, operation) {
  const status = batch.steps[operation.id];
  if (status === 'waiting') return null;
  if (status === 'called') return { status: 'pending', icon: '…', message: `${operation.label} — calling` };
  if (status === 'success') return { status: 'success', icon: '✓', message: `${operation.label} — success` };
  if (status === 'submitted') return { status: 'success', icon: '✓', message: `${operation.label} — submitted; awaiting independent confirmation` };
  if (status === 'blocked') return { status: 'failed', icon: '×', message: `${operation.label} — blocked` };
  if (status === 'unknown') return { status: 'failed', icon: '×', message: `${operation.label} — unknown result` };
  return { status: 'failed', icon: '×', message: `${operation.label} — failed` };
}

function progressEntries(batch) {
  const entries = batchOperations.map((operation) => progressEntry(batch, operation)).filter(Boolean);
  const stoppedAt = batchOperations.findIndex(({ id }) => ['blocked', 'unknown', 'failed'].includes(batch.steps[id]));
  if (stoppedAt >= 0) {
    const remaining = batchOperations.length - stoppedAt - 1;
    entries.push({ status: 'failed', icon: '×', message: `Batch stopped — ${remaining} remaining operation${remaining === 1 ? '' : 's'} were not called` });
  } else if (batch.status === 'complete') {
    entries.push({ status: 'success', icon: '✓', message: 'Batch complete' });
  } else if (entries.length === 0) {
    entries.push({ status: 'pending', icon: '…', message: 'Batch is starting' });
  }
  return entries;
}

export function BatchOperationsStepComponent({ batches, onClearLastBatch, onStartNewBatch, networkLabel, walletAttached }) {
  const latest = batches.at(-1);
  const running = latest?.status === 'running';
  const progress = latest ? progressEntries(latest) : [];
  return (
    <StepComponent
      number="04"
      title="Batch Operations"
      detail="Run every wallet-backed diagnostic in the same order it appears on this page."
      status={{ label: running ? 'Batch running' : latest ? `Batch ${latest.status}` : 'No batch', tone: running || latest?.status === 'complete' ? 'online' : 'neutral' }}
    >
      <p className="field-help">Start is the single explicit authorization for this ordered sequence, including onboarding, asset creation, and contract creation. Submission is not settlement. Clear removes this progress only; it does not cancel an Arkade operator intent.</p>
      <div className="operation-list account-operation-list">
        <article className="operation">
          <div className="operation-copy"><h3>Clear Last Batch</h3><p>Remove the newest completed batch progress from this page.</p></div>
          <div className="operation-actions"><button type="button" className="operation-button" onClick={onClearLastBatch} disabled={!latest || running}>Clear Last Batch</button><DocumentationLinkComponent href="https://docs.arkadeos.com/wallets/getting-started/introduction" tooltip="Read more about wallet operations" /></div>
        </article>
        <article className="operation">
          <div className="operation-copy"><h3>Start New Batch</h3><p>Run all wallet-backed {networkLabel} diagnostics in displayed order, stopping only when an operation is blocked, unavailable, unknown, or fails.</p></div>
          <div className="operation-actions"><button type="button" className="operation-button" onClick={onStartNewBatch} disabled={!walletAttached || running}>Start New Batch</button><DocumentationLinkComponent href="https://docs.arkadeos.com/wallets/advanced/settlement-process" tooltip="Read more about batch settlement" /></div>
        </article>
      </div>
      <div className="batch-progress" aria-label="Batch progress" role="log" aria-live="polite">
        {latest ? progress.map(({ status, icon, message }) => (
          <p key={message} className={`progress-entry progress-entry-${status}`} data-progress-status={progressStatusClass[status]}>
            <span className="progress-entry-icon" aria-hidden="true">{icon}</span>{message}
          </p>
        )) : <p className="batch-progress-empty">Attach a wallet, then Start New Batch to run every wallet-backed diagnostic in page order.</p>}
      </div>
    </StepComponent>
  );
}
