## Why

The ArkadeOS Network API Diagnostics flow has no visible sequential batch runner for every wallet-backed control on the page. Operators need an asynchronous, truthful progress field that makes the full displayed sequence and each terminal outcome explicit.

## What Changes

- Insert **04. Batch Operations** after Wallet Session and renumber Basic, Asset, and Contract Operations to 05, 06, and 07.
- Add **Start New Batch** and **Clear Last Batch** controls for a selected-network wallet diagnostic sequence.
- Display a fixed 300px, scrollable, read-only asynchronous progress field. Start calls all eight wallet-backed operations in their displayed order: Balance, Onboard Balance, Activity, Asset Prerequisites, Owned Assets, Create/Verify Demo Asset, Contracts, and Create Demo Contract.
- Stop only when an operation is blocked, unavailable, unknown, or fails. A submitted onboarding or unverified asset issue is reported truthfully and does not represent settlement.
- Keep Start as the single explicit authorization for the real state-changing operations; Clear Last Batch never cancels a submitted operator intent.

## Capabilities

### New Capabilities

- `batch-operations`: Sequential wallet diagnostic batches with truthful asynchronous progress and safe local clearing.

### Modified Capabilities

- None.

## Impact

- `src/App.jsx`, a focused Batch Operations component, and pure batch runner/state helpers.
- Wallet-operation outcome metadata, focused React/Node tests, README workflow description, and browser verification.
- No dependency, backend, or Arkade SDK change; Start invokes existing wallet functions only after the operator explicitly presses it.
