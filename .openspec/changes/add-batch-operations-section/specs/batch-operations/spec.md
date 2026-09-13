## Purpose

Provide a safe, visible run of every wallet-backed diagnostic operation in the order it is displayed, with progress that does not overstate an Arkade operator outcome.

## ADDED Requirements

### Requirement: Batch Operations step is part of the diagnostic flow
The diagnostic interface SHALL display **04. Batch Operations** immediately after Wallet Session. The existing Basic, Asset, and Contract Operations steps SHALL follow as 05, 06, and 07 respectively.

#### Scenario: Operator opens the diagnostic workflow

- **WHEN** the diagnostic flow is rendered
- **THEN** Batch Operations is the fourth numbered step and Basic, Asset, and Contract Operations are numbered 05, 06, and 07 in that order

### Requirement: Batch runs every wallet-backed page operation in order
The Batch Operations step SHALL provide **Start New Batch** and **Clear Last Batch** controls and a read-only asynchronous progress field. Start New Batch SHALL require an attached wallet and call the wallet-backed diagnostic operations in this exact order: Check Balance, Onboard Balance, List Wallet Activity, Check Asset Prerequisites, List Owned Assets, Create and Verify Demo Asset, List Contracts, and Create Demo Contract. A running batch SHALL prevent a duplicate Start or Clear action.

#### Scenario: Every available operation is called in page order

- **WHEN** the operator starts a batch with an attached wallet and each operation returns a usable result
- **THEN** the field updates after each operation and each subsequent operation begins only after the prior operation's result is recorded

#### Scenario: A terminal result stops later operations

- **WHEN** a batch operation is blocked, unavailable, unknown, or fails
- **THEN** the field records that result and every later operation remains not called

### Requirement: Progress reports write outcomes truthfully
The progress field SHALL distinguish successful reads and verified creations from a submitted onboarding or asset-issuance request. A submitted write SHALL be described as submitted and awaiting independent confirmation, but SHALL not by itself stop otherwise available later diagnostics. The field SHALL not state that an operator batch settled merely because a request was submitted.

#### Scenario: Onboarding request is accepted

- **WHEN** Onboard Balance is accepted
- **THEN** the field reports `Onboard Balance....called....submitted` and explains that independent confirmation remains pending before continuing to List Wallet Activity

#### Scenario: Asset issue is not yet visible

- **WHEN** a demo asset issuance is submitted but fresh ownership is not visible
- **THEN** the field reports a submitted result and continues to the contract diagnostics without claiming ownership

### Requirement: Progress is fixed-height and scrollable
The progress field SHALL remain non-editable, be exactly 300px tall, and expose a vertical scrollbar so every recorded operation remains accessible. Successful and submitted lines SHALL have a green check at the left; blocked, unknown, and failed lines SHALL have a red X. A terminal batch SHALL show one concise summary of how many remaining operations were not called instead of rendering one redundant line for each.

#### Scenario: Complete batch log exceeds the field viewport

- **WHEN** progress contains all eight operations or long outcome text
- **THEN** the field retains its 300px height and can be vertically scrolled

### Requirement: Clearing only removes local progress
Clear Last Batch SHALL remove the newest displayed batch progress only after it has reached a terminal state. Clearing SHALL not call a wallet, indexer, or operator API; cancel a submitted intent; alter a wallet session; or represent an Arkade operator-batch cancellation.

#### Scenario: Operator clears completed progress

- **WHEN** the latest displayed batch is terminal and the operator selects Clear Last Batch
- **THEN** that local progress is removed without a network or wallet mutation

#### Scenario: No wallet is attached

- **WHEN** no wallet is attached
- **THEN** Start New Batch is unavailable and the progress field explains that a wallet is required

#### Scenario: Operator changes the selected network

- **WHEN** the selected diagnostic network changes
- **THEN** its local diagnostic batch markers are cleared with the other in-memory diagnostic results
