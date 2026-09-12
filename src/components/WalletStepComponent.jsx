import { StepComponent } from './StepComponent.jsx';

export function WalletStepComponent({ phrase, message, address, loading, onPhraseChange, onAddWallet }) {
  return (
    <StepComponent
      number="2"
      title="Attach a read-only wallet"
      detail="Derive a public Signet address in this browser without persisting your phrase."
      status={{ label: 'Memory only', tone: 'neutral' }}
    >
      <label htmlFor="recovery-phrase">Recovery phrase</label>
      <input
        id="recovery-phrase"
        type="password"
        value={phrase}
        onChange={(event) => onPhraseChange(event.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
        placeholder="word1 word2 word3 …"
      />
      <p className="field-help">Use one space between each word. This app does not store or log the phrase.</p>
      <button type="button" onClick={onAddWallet} disabled={loading}>
        {loading ? 'Deriving public address…' : 'Add wallet & call operation'}
      </button>
      <p className="message" aria-live="polite">{message}</p>
      {address ? <output className="address" aria-live="polite">{address}</output> : null}
    </StepComponent>
  );
}
