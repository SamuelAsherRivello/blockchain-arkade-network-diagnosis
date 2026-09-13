const reachabilityLabel = {
  yes: 'Yes',
  no: 'No',
  pending: 'Pending',
};

export function formatOperationResultSummary({ backendReachable, elapsedSeconds = 0 }) {
  const reachable = reachabilityLabel[backendReachable] ?? 'Unknown';
  const seconds = Math.max(0, Math.round(elapsedSeconds));
  return `Output - (Reachable: ${reachable}, Time: ${seconds} secs)`;
}
