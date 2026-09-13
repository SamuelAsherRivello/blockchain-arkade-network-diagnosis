import { formatOperationResultSummary } from '../operation-result.js';
import { CopyButtonComponent } from './CopyButtonComponent.jsx';
import { DocumentationLinkComponent } from './DocumentationLinkComponent.jsx';

export function OperationListComponent({ operations, results, runningId, onRun }) {
  return (
    <div className="operation-list">
      {operations.map((operation) => {
        const result = results[operation.id];
        const isRunning = runningId === operation.id;
        return (
          <article className="operation" key={operation.id}>
            <div className="operation-copy">
              <h3>{operation.title}</h3>
              <p>{operation.description}</p>
            </div>
            <div className="operation-actions">
              <button type="button" className="operation-button" onClick={() => onRun(operation.id)} disabled={Boolean(runningId)}>
                {isRunning ? 'Calling…' : 'Run operation'}
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
  );
}
