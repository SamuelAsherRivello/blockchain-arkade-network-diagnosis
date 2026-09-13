import { StepComponent } from './StepComponent.jsx';
import { CopyButtonComponent } from './CopyButtonComponent.jsx';

export function WalletStepComponent({ phrase, message, address, boardingAddress, loading, loggedIn, onPhraseChange, onLogin, onLogout, onResetLocalSession, networkLabel, funding }) {
  return (
    <StepComponent
      number="03"
      title="Wallet session"
      detail={`Log in once to keep this ${networkLabel} wallet available after a page refresh on this browser.`}
      status={{ label: loggedIn ? 'Logged in' : 'Logged out', tone: loggedIn ? 'online' : 'neutral' }}
    >
      {loggedIn ? <>
        <p className="message">This wallet is logged in on this browser.</p>
        <div className="funding-routes" aria-live="polite">
          <section>
            <p className="funding-label">Arkade receive address</p>
            <div className="copyable-value"><output className="address">{address}</output><CopyButtonComponent value={address} label="Arkade receive address" /></div>
          </section>
          <section>
            <p className="funding-label">{networkLabel} Bitcoin boarding address</p>
            <div className="copyable-value"><output className="address">{boardingAddress}</output><CopyButtonComponent value={boardingAddress} label={`${networkLabel} Bitcoin boarding address`} /></div>
            <a href={funding.url} target="_blank" rel="noreferrer" aria-label="Open the selected network faucet">{funding.label}</a>
          </section>
        </div>
        <div className="wallet-actions">
          <button type="button" className="secondary-action" onClick={onResetLocalSession} disabled={loading}>Reset local wallet session</button>
          <button type="button" className="secondary-action" onClick={onLogout} disabled={loading}>Log out</button>
        </div>
        <p className="field-help">Reset clears only this detector’s volatile SDK data, then rebuilds the session from encrypted browser storage. It does not submit a transaction or change Signet funds.</p>
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
