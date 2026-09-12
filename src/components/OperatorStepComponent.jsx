import { StepComponent } from './StepComponent.jsx';
import { OperationListComponent } from './OperationListComponent.jsx';

export function OperatorStepComponent({ result, checking, onCheck, operations, results, runningId, onRun }) {
  const status = checking
    ? { label: 'Checking', tone: 'neutral' }
    : result.status === 'online'
      ? { label: 'Reachable', tone: 'online' }
      : result.status === 'unavailable'
        ? { label: 'Unavailable', tone: 'unavailable' }
        : { label: 'Not checked', tone: 'neutral' };

  return (
    <StepComponent
      number="01"
      title="Verify the operator"
      detail="Call the public Signet endpoint directly from this browser."
      status={status}
    >
      <p className="endpoint">GET <code>https://signet.arkade.sh/v1/info</code></p>
      <div className="operator-check"><button type="button" onClick={onCheck} disabled={checking}>
        {checking ? 'Checking Arkade Signet…' : 'Check Arkade Signet'}
      </button></div>
      <p className="message" aria-live="polite">{result.message}</p>
      <OperationListComponent operations={operations} results={results} runningId={runningId} onRun={onRun} />
    </StepComponent>
  );
}
