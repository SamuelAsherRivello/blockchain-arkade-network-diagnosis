import { StepComponent } from './StepComponent.jsx';
import { OperationListComponent } from './OperationListComponent.jsx';
import { CopyButtonComponent } from './CopyButtonComponent.jsx';
import { DocumentationLinkComponent } from './DocumentationLinkComponent.jsx';

export function OperatorStepComponent({ result, checking, onCheck, operations, results, runningId, onRun, networkLabel, endpoint }) {
  const status = checking
    ? { label: 'Checking', tone: 'neutral' }
    : result.status === 'online'
      ? { label: 'Reachable', tone: 'online' }
      : result.status === 'unavailable'
        ? { label: 'Unavailable', tone: 'unavailable' }
        : { label: 'Not checked', tone: 'neutral' };

  return (
    <StepComponent
      number="02"
      title="Verify the operator"
      detail={`Call the public ${networkLabel} endpoint directly from this browser.`}
      status={status}
    >
      <div className="copyable-inline endpoint"><span>GET <code>{endpoint}/v1/info</code></span><CopyButtonComponent value={`GET ${endpoint}/v1/info`} label="operator endpoint" /></div>
      <div className="operator-check operation-actions"><button type="button" onClick={onCheck} disabled={checking}>
        {checking ? `Checking Arkade ${networkLabel}…` : `Check Arkade ${networkLabel}`}
      </button><DocumentationLinkComponent href="https://docs.arkadeos.com/arkd/core-services/ark-service" tooltip="Read more about Arkade operators" /></div>
      <p className="message" aria-live="polite">{result.message}</p>
      <OperationListComponent operations={operations} results={results} runningId={runningId} onRun={onRun} />
    </StepComponent>
  );
}
