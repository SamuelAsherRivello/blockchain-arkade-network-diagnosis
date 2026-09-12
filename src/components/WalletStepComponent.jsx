import { StepComponent } from './StepComponent.jsx';

export function WalletStepComponent({ phrase, message, address, boardingAddress, loading, loggedIn, onPhraseChange, onLogin, onLogout }) {
  return (
    <StepComponent
      number="02"
      title="Wallet session"
      detail="Log in once to keep this Signet wallet available after a page refresh on this browser."
      status={{ label: loggedIn ? 'Logged in' : 'Logged out', tone: loggedIn ? 'online' : 'neutral' }}
    >
      {loggedIn ? <>
        <p className="message">This wallet is logged in on this browser.</p>
        <div className="funding-routes" aria-live="polite">
          <section>
            <p className="funding-label">Arkade receive address</p>
            <output className="address">{address}</output>
            <a href="https://arkfaucet.com/" target="_blank" rel="noreferrer">Fund with Ark Faucet</a>
          </section>
          <section>
            <p className="funding-label">Signet Bitcoin boarding address</p>
            <output className="address">{boardingAddress}</output>
            <a href="https://signet.2nd.dev/" target="_blank" rel="noreferrer">Get Signet BTC</a>
          </section>
        </div>
        <div className="wallet-actions"><button type="button" className="secondary-action" onClick={onLogout} disabled={loading}>Log out</button></div>
      </> : <>
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
        <p className="field-help">Use one space between each word. The phrase is encrypted in this browser for this detector only; it is never sent or logged.</p>
        <div className="wallet-actions"><button type="button" onClick={onLogin} disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button></div>
      </>}
      <p className="message" aria-live="polite">{message}</p>
    </StepComponent>
  );
}
