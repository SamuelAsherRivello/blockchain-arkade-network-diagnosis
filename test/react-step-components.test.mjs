import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runOperation } from '../src/operations.js';

const component = (name) => readFile(new URL(`../src/components/${name}.jsx`, import.meta.url), 'utf8');

test('renders the diagnostic flow in workflow order across five React steps', async () => {
  const [app, step, operator, wallet, assetReadiness, accountOperations, operations] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    component('StepComponent'),
    component('OperatorStepComponent'),
    component('WalletStepComponent'),
    component('AssetReadinessOperationComponent'),
    component('AccountOperationsStepComponent'),
    component('OperationListComponent'),
  ]);

  assert.match(app, /OperatorStepComponent/);
  assert.match(app, /WalletStepComponent/);
  assert.match(app, /AccountOperationsStepComponent/);
  assert.doesNotMatch(app, /handleOnboardHalfBalance/);
  assert.match(step, /export function StepComponent/);
  assert.match(operator, /StepComponent/);
  assert.match(wallet, /StepComponent/);
  assert.match(wallet, /Log in/);
  assert.match(wallet, /Log out/);
  assert.doesNotMatch(assetReadiness, /StepComponent/);
  assert.match(assetReadiness, /without Bitcoin change/);
  assert.match(assetReadiness, /receipt-bound recovery before it can submit a 50% route/);
  assert.match(assetReadiness, /no confirmed eligible Bitcoin inputs are available/);
  assert.doesNotMatch(assetReadiness, /onClick=\{onOnboard\}/);
  assert.match(assetReadiness, /Asset indexer reachable:/);
  assert.match(assetReadiness, /Bitcoin boarding route:/);
  assert.match(accountOperations, /number/);
  assert.match(accountOperations, /title/);
  assert.match(accountOperations, /Click to transfer/);
  assert.match(app, /handleMintAutofix/);
  assert.match(operations, /export function OperationListComponent/);
  assert.match(app, /number="03"[\s\S]*title="Basic Operations"/);
  assert.match(app, /number="04"[\s\S]*title="Asset Operations"/);
  assert.match(app, /number="05"[\s\S]*title="Contract Operations"/);
  assert.match(operator, /OperationListComponent/);
});

test('rates a verified selected-network response as backend reachable', async () => {
  const result = await runOperation('operator-info', 'signet', async () => ({
    ok: true,
    status: 200,
    json: async () => ({ network: 'signet', protocol: 1 }),
  }));

  assert.equal(result.backendReachable, 'yes');
  assert.match(result.output, /"network": "signet"/);
});

test('lists operator checks and exposes a reachable yes or no verdict', async () => {
  const [operations, componentSource] = await Promise.all([
    readFile(new URL('../src/operations.js', import.meta.url), 'utf8'),
    component('OperationListComponent'),
  ]);

  assert.match(operations, /operator-info/);
  assert.match(operations, /fee-policy/);
  assert.match(operations, /session-schedule/);
  assert.match(operations, /backendReachable/);
  assert.match(componentSource, /Backend reachable:/);
});

test('keeps the asset readiness component interface limited to values it renders', async () => {
  const [app, assetReadiness] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    component('AssetReadinessOperationComponent'),
  ]);

  assert.doesNotMatch(app, /<AssetReadinessOperationComponent[\s\S]*\bonboarding=\{onboarding\}/);
  assert.doesNotMatch(assetReadiness, /\bonboarding\b/);
});

test('preserves React lifecycle, list-key, accessibility, and external-link conventions', async () => {
  const [main, app, operator, wallet, accountOperations, operations] = await Promise.all([
    readFile(new URL('../src/main.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    component('OperatorStepComponent'),
    component('WalletStepComponent'),
    component('AccountOperationsStepComponent'),
    component('OperationListComponent'),
  ]);

  assert.match(main, /<StrictMode>/);
  assert.match(app, /useEffect\(\(\) => \{[\s\S]*let active = true;/);
  assert.match(app, /if \(!active \|\| !isCurrent\(epoch\)\) return;/);
  assert.match(app, /return \(\) => \{ active = false; \};/);
  assert.match(operator, /aria-live="polite"/);
  assert.match(wallet, /aria-live="polite"/);
  assert.match(app, /target="_blank" rel="noreferrer"/);
  assert.match(accountOperations, /key=\{operation\.id\}/);
  assert.match(operations, /key=\{operation\.id\}/);
});

test('puts accessible project resource links and the persisted network selector at the top of the page', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

  assert.match(app, /className="resource-link github-link"/);
  assert.match(app, /href="https:\/\/github\.com\/SamuelAsherRivello\/blockchain-arkade-signet-down-detector"/);
  assert.match(app, /aria-label="Open the Blockchain Arkade Signet Down Detector GitHub repository"/);
  assert.match(app, /href="https:\/\/docs\.arkadeos\.com\/"/);
  assert.match(app, /aria-label="Open ArkadeOS documentation"/);
  assert.match(app, /loadNetworkPreference/);
  assert.match(app, /saveNetworkPreference/);
  assert.match(app, /type="radio" name="arkade-network"/);
  assert.match(app, /ArkadeOS Network API Diagnostics/);
  assert.match(app, /<svg[^>]*aria-hidden="true"/);
});

test('creates a one-wallet demo contract and verifies demo asset ownership rather than retaining BIS prerequisites', async () => {
  const [app, wallet] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/wallet.js', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /id: 'create-contract', title: 'Create demo receive contract'/);
  assert.match(app, /id: 'mint', title: 'Create and verify a demo asset'/);
  assert.doesNotMatch(wallet, /BIS LTO/);
  assert.match(wallet, /wallet\.getNewAddresses\(\{ types: \['default'\], forceNew: true \}\)/);
  assert.match(wallet, /ownershipVerified: Boolean\(ownedAsset\)/);
  assert.doesNotMatch(wallet, /contractReadiness/);
});

test('makes every operator operation use the selected network', async () => {
  const source = await readFile(new URL('../src/operations.js', import.meta.url), 'utf8');
  assert.match(source, /createArkadeOperations\(network = defaultNetwork\)/);
  assert.match(source, /fetchOperatorInfo\(network, fetchImpl\)/);
  assert.match(source, /operatorInfoUrl\(network\)/);
});

test('keeps standalone detector copy free of stale BIS references', async () => {
  const [app, wallet, core] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/wallet.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/detector-core.js', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(app, /\bBIS\b/);
  assert.doesNotMatch(wallet, /\bBIS\b/);
  assert.doesNotMatch(core, /\bBIS\b/);
});
