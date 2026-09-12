export function AssetReadinessOperationComponent({ result, checking, onboardingResult, walletAttached, onCheck }) {
  return (
    <div className="asset-readiness-operation">
      <div className="asset-readiness-heading">
        <div>
          <h3>Check asset prerequisites</h3>
          <p>Confirm that the live asset indexer can read spendable funds for the logged-in wallet before any mint attempt.</p>
        </div>
        <button type="button" className="secondary-action operation-button" onClick={onCheck} disabled={checking || !walletAttached}>
          {checking ? 'Checking asset prerequisites…' : 'Check asset prerequisites'}
        </button>
      </div>
      {result ? <div className={`asset-readiness ${result.backendReachable === 'yes' ? 'result-online' : 'result-unavailable'}`}><p><strong>Asset indexer reachable:</strong> {result.backendReachable}</p><p>{result.message}</p>{result.status === 'ready' ? <pre>{JSON.stringify({ spendableVtxoCount: result.spendableVtxoCount, spendableSats: result.spendableSats, minimumSats: result.minimumSats, canMint: result.canMint }, null, 2)}</pre> : null}</div> : null}
      {result?.boarding ? <div className="boarding-action">
        <p><strong>Bitcoin boarding route:</strong> {result.boarding.status === 'ready' ? 'Confirmed eligible Bitcoin inputs are available.' : result.boarding.backendReachable === 'yes' ? 'The operator and Bitcoin provider responded, but no confirmed eligible Bitcoin inputs are available.' : 'Unavailable.'}</p>
        {result.boarding.status === 'ready' ? <>
          <p><strong>Route:</strong> Signet Bitcoin boarding balance &nbsp;→&nbsp; <strong>Arkade spendable balance</strong> &nbsp;→&nbsp; separate Bitcoin return</p>
          <p><strong>Target:</strong> {result.boarding.amountSats.toLocaleString()} Arkade sats (50% of {result.boarding.availableSats.toLocaleString()} confirmed Bitcoin sats). The first leg boards the selected total without Bitcoin change; the remaining {result.boarding.retainedBitcoinSats.toLocaleString()} sats needs a separate, receipt-bound return after the first leg is confirmed.</p>
          <p className="mutation-note">This detector needs receipt-bound recovery before it can submit a 50% route. Use Check balance and List activity to reconcile the current inputs; it will not submit them again.</p>
        </> : <p className="mutation-note">No 50% route is available until confirmed eligible Bitcoin inputs are present.</p>}
      </div> : null}
      {onboardingResult ? <div className={`asset-readiness ${onboardingResult.outcome === 'unknown' ? 'result-unavailable' : onboardingResult.backendReachable === 'yes' ? 'result-online' : 'result-unavailable'}`}><p><strong>Backend reachable:</strong> {onboardingResult.backendReachable}</p><p>{onboardingResult.message}</p>{onboardingResult.output ? <pre>{onboardingResult.output}</pre> : null}</div> : null}
    </div>
  );
}
