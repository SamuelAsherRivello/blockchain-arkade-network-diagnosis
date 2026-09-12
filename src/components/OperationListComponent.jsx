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
            <button type="button" className="operation-button" onClick={() => onRun(operation.id)} disabled={Boolean(runningId)}>
              {isRunning ? 'Calling…' : 'Run operation'}
            </button>
            {result ? (
              <div className={`operation-result ${result.backendReachable === 'yes' ? 'result-online' : result.backendReachable === 'pending' ? 'result-pending' : 'result-unavailable'}`}>
                <p><strong>Backend reachable:</strong> {result.backendReachable}</p>
                <p>{result.message}</p>
                <pre>{result.output}</pre>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
