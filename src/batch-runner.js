const terminalStatuses = new Set(['blocked', 'failed', 'unknown']);
const reachable = (result) => result?.backendReachable === 'yes';

function resultStatus(step, result) {
  const explicit = step.resultStatus?.(result) ?? result?.outcome;
  if (['blocked', 'failed', 'unknown', 'submitted'].includes(explicit)) return explicit;
  return reachable(result) ? 'success' : 'failed';
}

export async function runBatch({ steps, onTransition, shouldContinue = () => true }) {
  for (const step of steps) {
    if (!shouldContinue()) return 'interrupted';
    onTransition({ step: step.id, status: 'called' });
    let result;
    try {
      result = await step.run();
    } catch {
      onTransition({ step: step.id, status: 'failed' });
      return 'failed';
    }
    const status = resultStatus(step, result);
    onTransition({ step: step.id, status });
    if (terminalStatuses.has(status)) return status;
  }
  return 'complete';
}
