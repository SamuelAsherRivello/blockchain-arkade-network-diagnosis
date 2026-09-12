import { StepComponent } from './StepComponent.jsx';

export function OperatorStepComponent({ result, checking, onCheck }) {
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
      <button type="button" onClick={onCheck} disabled={checking}>
        {checking ? 'Checking Arkade Signet…' : 'Check Arkade Signet'}
      </button>
      <p className="message" aria-live="polite">{result.message}</p>
    </StepComponent>
  );
}
