export function AssetReadinessOperationComponent({ result, checking, walletAttached, onCheck }) {
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
      {result ? <div className={`asset-readiness ${result.backendReachable === 'yes' ? 'result-online' : 'result-unavailable'}`}><p><strong>Asset indexer reachable:</strong> {result.backendReachable}</p><p>{result.message}</p>{result.status === 'ready' && !result.canMint ? <p className="mutation-note">Warning: There is not enough spendable Arkade balance for this mint operation.</p> : null}{result.status === 'ready' ? <pre>{JSON.stringify({ spendableVtxoCount: result.spendableVtxoCount, spendableSats: result.spendableSats, minimumSats: result.minimumSats, canMint: result.canMint }, null, 2)}</pre> : null}</div> : null}
    </div>
  );
}
