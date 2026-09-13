## Context

See proposal.md and the `batch-operations` delta spec. The detector already exposes discrete wallet-backed reads and writes. Onboarding and asset issuance can submit external intent without providing independent settlement evidence.

## Goals / Non-Goals

**Goals:**

- Run every wallet-backed page operation in its exact displayed order after one explicit Start click.
- Keep result transitions inspectable and deterministic with injected test runners.
- Make the complete progress log available in a fixed 300px scrollable field.
- Reset markers when a network switch resets the rest of the in-memory diagnostics.

**Non-Goals:**

- Treating operator-intent submission as batch settlement.
- Cancelling a submitted intent through Clear Last Batch.
- Persisting progress across refreshes or adding a backend.

## Decisions

- Store a small immutable local collection in the React app. A batch records the eight named step transitions and a terminal batch outcome, and the read-only text field is derived from that state.
- Use a pure async runner injected with ordered step descriptors. It emits `called` then a semantic result for each step, continues after `submitted`, and stops before the next step on `blocked`, `failed`, or `unknown`.
- Asset preflight is included before asset reads and minting. A reachable preflight lacking sufficient funds is `blocked`, so a real asset issue is not attempted.
- Render the established collapsible `StepComponent` with a wallet-gated Start button, disabled Clear while a batch runs, and a semantic 300px live log with a persistent vertical scrollbar. Completed lines use green checks, terminal lines use red X marks, and a single terminal summary replaces repetitive uncalled-operation rows. The user click is the only route to writes.
- Reset the collection on selected-network changes alongside operation results. Clear only removes presentation state after completion and never dispatches a remote cancellation.

## Risks / Trade-offs

- [Batch includes real writes] → Start is disabled without a wallet and the runner invokes the functions only after the user clicks Start.
- [Submission can be mistaken for settlement] → Use `submitted` and an awaiting-independent-confirmation explanation; retain blocked, unknown, and failed outcomes.
- [A whole-page batch can be long] → The log is 300px fixed height and vertically scrollable.
- [Refresh drops progress] → Do not represent the field as durable history; it is the current page's batch progress.

## Migration Plan

1. Generalize the pure batch state helper and injected sequential runner with focused tests for the full operation order and terminal stops.
2. Update the progress field and controls, including the 300px scrollable layout and truthful submitted labels.
3. Wire the runner to the existing balance, onboarding, activity, asset, and contract functions after explicit Start.
4. Update documentation and verify static rendering plus mocked sequence behavior; do not start the real batch on the attached live wallet during QA.
5. Rollback consists of removing the isolated runner/component integration; a submitted live intent is not cancelable through rollback.
