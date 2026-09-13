## 1. Sequential batch behavior

- [x] 1.1 Generalize isolated batch state and the injected asynchronous runner for every wallet-backed page operation in displayed order; continue after submitted writes, stop on blocked/unavailable/unknown/failed outcomes, and verify focused Node tests without a live wallet.

## 2. Diagnostic workflow

- [x] 2.1 Render the 04. Batch Operations progress field with all eight operation lines, a fixed 300px scrollable read-only log, wallet-gated Start New Batch, terminal-only Clear Last Batch, and explicit no-cancellation/awaiting-confirmation copy.
- [x] 2.2 Wire the runner to the existing balance, onboarding, activity, asset readiness, asset list/mint, contract list/create functions after explicit Start; preserve network-reset behavior and prevent duplicate actions while a batch runs.

## 3. Documentation and verification

- [x] 3.1 Update the README workflow description for the full sequence, terminal-stop behavior, scrollable field, and submitted-versus-settled boundary.
- [x] 3.2 Run `npm test` and `npm run build`, then verify the live page renders the 300px scrollable field and disabled state without starting a real batch; check browser console errors and record the result.
