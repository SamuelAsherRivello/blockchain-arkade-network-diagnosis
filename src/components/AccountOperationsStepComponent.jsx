import { StepComponent } from './StepComponent.jsx';
import { formatOperationResultSummary } from '../operation-result.js';
import { CopyButtonComponent } from './CopyButtonComponent.jsx';
import { DocumentationLinkComponent } from './DocumentationLinkComponent.jsx';

export function AccountOperationsStepComponent({ number, title, detail, operations, results, runningId, walletAttached, onRun, beforeOperations, networkLabel }) {
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
                <h3>{operation.title} ({operation.mutation ? 'Read/Write' : 'Read'})</h3>
                <p>{operation.description}</p>
              </div>
              <div className="operation-actions">
                <button type="button" className="operation-button" onClick={() => onRun(operation.id)} disabled={Boolean(runningId) || !walletAttached}>
                  {isRunning ? 'Calling…' : operation.action}
                </button>
                <DocumentationLinkComponent href={operation.docsHref} tooltip={operation.docsTooltip} />
              </div>
              {result ? (
                <div className={`operation-result ${result.backendReachable === 'yes' ? 'result-online' : result.backendReachable === 'pending' ? 'result-pending' : 'result-unavailable'}`}>
                  <p className="operation-result-summary">{formatOperationResultSummary(result)}</p>
                  <p>{result.message}</p>
                  {result.output ? <div className="copyable-payload"><pre>{result.output}</pre><CopyButtonComponent value={result.output} label={`${operation.title} output`} /></div> : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </StepComponent>
  );
}
