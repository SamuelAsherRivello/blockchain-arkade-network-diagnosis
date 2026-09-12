import { StepComponent } from './StepComponent.jsx';

export function AccountOperationsStepComponent({ number, title, detail, operations, results, runningId, walletAttached, onRun, onAutoFix, beforeOperations, networkLabel }) {
  return (
    <StepComponent
      number={number}
      title={title}
      detail={detail}
      status={{ label: walletAttached ? 'Wallet attached' : 'Attach wallet first', tone: walletAttached ? 'online' : 'neutral' }}
    >
      {beforeOperations}
      <div className="operation-list account-operation-list">
        {operations.map((operation) => {
          const result = results[operation.id];
          const isRunning = runningId === operation.id;
          return (
            <article className={`operation ${operation.mutation ? 'operation-mutation' : ''}`} key={operation.id}>
              <div className="operation-copy">
                <h3>{operation.title}</h3>
                <p>{operation.description}</p>
                {operation.mutation ? <p className="mutation-note">This is a state-changing {networkLabel} action. It runs only when you press the button.</p> : null}
              </div>
              <button type="button" className="operation-button" onClick={() => onRun(operation.id)} disabled={Boolean(runningId) || !walletAttached}>
                {isRunning ? 'Calling…' : operation.action}
              </button>
              {result ? (
                <div className={`operation-result ${result.backendReachable === 'yes' ? 'result-online' : result.backendReachable === 'pending' ? 'result-pending' : 'result-unavailable'}`}>
                  <p><strong>Backend reachable:</strong> {result.backendReachable}</p>
                  <p>{result.message}</p>
                  {result.output ? <pre>{result.output}</pre> : null}
                  {result.autofix ? <div className="operation-autofix">
                    <p><strong>Auto-fix:</strong> {networkLabel} cannot preserve Bitcoin change in this boarding intent, so this transfers the full confirmed balance to Arkade.</p>
                    <button type="button" className="secondary-action" onClick={() => onAutoFix(operation.id)} disabled={Boolean(runningId) || !walletAttached}>
                      Click to transfer {result.autofix.amountBtc} BTC ({result.autofix.amountSats.toLocaleString()} sats) from {networkLabel} Bitcoin boarding balance to Arkade; then recheck mint {result.autofix.estimatedMinutes ? `after the next batch (~${result.autofix.estimatedMinutes} min)` : 'after the next operator batch'}.
                    </button>
                  </div> : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </StepComponent>
  );
}
