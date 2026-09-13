import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runOperation } from '../src/operations.js';

const component = (name) => readFile(new URL(`../src/components/${name}.jsx`, import.meta.url), 'utf8');

test('renders the diagnostic flow in workflow order across six React steps', async () => {
  const [app, step, network, operator, wallet, assetReadiness, accountOperations, operations] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    component('StepComponent'),
    component('NetworkStepComponent'),
    component('OperatorStepComponent'),
    component('WalletStepComponent'),
    component('AssetReadinessOperationComponent'),
    component('AccountOperationsStepComponent'),
    component('OperationListComponent'),
  ]);

  assert.match(app, /OperatorStepComponent/);
  assert.match(app, /WalletStepComponent/);
  assert.match(app, /AccountOperationsStepComponent/);
  assert.match(app, /NetworkStepComponent/);
  assert.doesNotMatch(app, /handleOnboardHalfBalance/);
  assert.match(step, /export function StepComponent/);
  assert.match(network, /number="01"/);
  assert.match(network, /title="Choose Network"/);
  assert.match(network, /<select/);
  assert.match(network, /onChange/);
  assert.match(operator, /StepComponent/);
  assert.match(wallet, /StepComponent/);
  assert.match(wallet, /Log in/);
  assert.match(wallet, /Log out/);
  assert.doesNotMatch(assetReadiness, /StepComponent/);
  assert.match(assetReadiness, /Asset indexer reachable:/);
  assert.match(assetReadiness, /Warning: There is not enough spendable Arkade balance for this mint operation\./);
  assert.doesNotMatch(assetReadiness, /Bitcoin boarding route|receipt-bound recovery|without Bitcoin change/);
  assert.match(accountOperations, /number/);
  assert.match(accountOperations, /title/);
  assert.doesNotMatch(accountOperations, /Click to transfer/);
  assert.match(app, /'onboard-balance': onboardHalfBalance/);
  assert.match(operations, /export function OperationListComponent/);
  assert.match(app, /number="04"[\s\S]*title="Basic Operations"/);
  assert.match(app, /number="05"[\s\S]*title="Asset Operations"/);
  assert.match(app, /number="06"[\s\S]*title="Contract Operations"/);
  assert.match(operator, /number="02"/);
  assert.match(wallet, /number="03"/);
  assert.match(operator, /OperationListComponent/);
});

test('gives every numbered step an initially expanded collapsible title bar', async () => {
  const step = await component('StepComponent');

  assert.match(step, /useState\(true\)/);
  assert.match(step, /className="step-title-bar"/);
  assert.match(step, /aria-expanded=\{expanded\}/);
  assert.match(step, /aria-controls=\{contentId\}/);
  assert.match(step, /id=\{contentId\}/);
  assert.match(step, /hidden=\{!expanded\}/);
  assert.match(step, /step-title-status/);
  assert.match(step, /className="step-title-icon"/);
  assert.match(step, /viewBox="0 0 24 24"/);
  assert.match(step, /<path d="M6 9l6 6 6-6"/);
  assert.doesNotMatch(step, /⌄/);
});

test('sizes the collapsible chevron as a compact control icon', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');

  assert.match(css, /\.step-title-icon\s*\{[^}]*width:\s*1rem/);
  assert.match(css, /\.step-title-icon\s*\{[^}]*height:\s*1rem/);
  assert.match(css, /\.step-title-bar\[aria-expanded="false"\]\s+\.step-title-icon/);
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

test('puts accessible project resource links at the top of the page and the persisted network dropdown in Step 01', async () => {
  const [app, network] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    component('NetworkStepComponent'),
  ]);

  assert.match(app, /className="resource-link github-link"/);
  assert.match(app, /href="https:\/\/github\.com\/SamuelAsherRivello\/blockchain-arkade-network-diagnosis"/);
  assert.match(app, /aria-label="Open the Arkade OS Network Diagnostics GitHub repository"/);
  assert.match(app, /href="https:\/\/docs\.arkadeos\.com\/"/);
  assert.match(app, /aria-label="Open ArkadeOS documentation"/);
  assert.match(app, /loadNetworkPreference/);
  assert.match(app, /saveNetworkPreference/);
  assert.match(network, /id="arkade-network"/);
  assert.match(network, /<select/);
  assert.doesNotMatch(app, /type="radio" name="arkade-network"/);
  assert.match(app, /ArkadeOS Network API Diagnostics/);
  assert.doesNotMatch(app, /context-line|Runbook|runbook-header|Direct browser call|Wallet mode/);
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
