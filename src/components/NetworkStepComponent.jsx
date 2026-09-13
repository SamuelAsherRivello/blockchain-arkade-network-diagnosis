import { StepComponent } from './StepComponent.jsx';

export function NetworkStepComponent({ network, networks, onChange, disabled }) {
  return (
    <StepComponent
      number="01"
      title="Choose Network"
      detail="Select the Arkade test network for this diagnostic run. Your choice is saved on this browser."
    >
      <label htmlFor="arkade-network">Network</label>
      <select
        id="arkade-network"
        className="network-select"
        value={network}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {Object.entries(networks).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
      </select>
      <p className="field-help">Changing the network logs out the active wallet session and requires a login for the selected network.</p>
    </StepComponent>
  );
}
