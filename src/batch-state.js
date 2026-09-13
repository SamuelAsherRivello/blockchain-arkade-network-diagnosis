export const batchStepIds = [
  'balance',
  'onboarding',
  'activity',
  'asset-readiness',
  'assets',
  'mint',
  'contracts',
  'create-contract',
];

const waitingSteps = () => Object.fromEntries(batchStepIds.map((step) => [step, 'waiting']));

export function createBatchState() {
  return { lastIssuedId: 0, batches: [] };
}

export function startNewBatch(state, network) {
  const id = state.lastIssuedId + 1;
  return {
    lastIssuedId: id,
    batches: [...state.batches, { id, network, status: 'running', steps: waitingSteps() }],
  };
}

export function clearLastBatch(state) {
  if (state.batches.length === 0 || state.batches.at(-1).status === 'running') return state;
  return { ...state, batches: state.batches.slice(0, -1) };
}

export function transitionBatch(state, id, { step, status }) {
  return {
    ...state,
    batches: state.batches.map((batch) => (
      batch.id === id ? { ...batch, steps: { ...batch.steps, [step]: status } } : batch
    )),
  };
}

export function finishBatch(state, id, status) {
  return {
    ...state,
    batches: state.batches.map((batch) => (batch.id === id ? { ...batch, status } : batch)),
  };
}
