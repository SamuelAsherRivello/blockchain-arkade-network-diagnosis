import { formatOperationResultSummary } from '../operation-result.js';
import { CopyButtonComponent } from './CopyButtonComponent.jsx';
import { DocumentationLinkComponent } from './DocumentationLinkComponent.jsx';

export function AssetReadinessOperationComponent({ result, checking, walletAttached, onCheck }) {
  const output = result?.status === 'ready'
    ? JSON.stringify({ spendableVtxoCount: result.spendableVtxoCount, spendableSats: result.spendableSats, minimumSats: result.minimumSats, canMint: result.canMint }, null, 2)
    : '';
  return (
    <div className="asset-readiness-operation">
      <div className="asset-readiness-heading">
        <div>
          <h3>Check asset prerequisites</h3>
          <p>Confirm that the live asset indexer can read spendable funds for the logged-in wallet before any mint attempt.</p>
        </div>
        <div className="operation-actions">
          <button type="button" className="secondary-action operation-button" onClick={onCheck} disabled={checking || !walletAttached}>
            {checking ? 'Checking asset prerequisites…' : 'Check asset prerequisites'}
          </button>
          <DocumentationLinkComponent href="https://docs.arkadeos.com/wallets/operations/assets/check-balance" tooltip="Read more about asset balances" />
        </div>
      </div>
      {result ? <div className={`asset-readiness ${result.backendReachable === 'yes' ? 'result-online' : 'result-unavailable'}`}><p className="operation-result-summary">{formatOperationResultSummary(result)}</p><p>{result.message}</p>{result.status === 'ready' && !result.canMint ? <p className="mutation-note">Warning: There is not enough spendable Arkade balance for this mint operation.</p> : null}{output ? <div className="copyable-payload"><pre>{output}</pre><CopyButtonComponent value={output} label="asset prerequisites output" /></div> : null}</div> : null}
    </div>
  );
}
