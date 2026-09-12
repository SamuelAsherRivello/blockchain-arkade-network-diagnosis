import { signetInfoUrl } from './detector-core.js';
import { fetchOperatorInfo } from './operator.js';

export const arkadeOperations = [
  {
    id: 'operator-info',
    title: 'Read operator information',
    description: 'Fetch the operator identity and supported network.',
    select: (info) => ({ endpoint: signetInfoUrl, network: info.network, protocol: info.protocol ?? 'Not reported' }),
  },
  {
    id: 'network-verification',
    title: 'Verify Signet network',
    description: 'Confirm this public endpoint identifies itself as Signet.',
    select: (info) => ({ expectedNetwork: 'signet', receivedNetwork: info.network, verified: info.network === 'signet' }),
  },
  {
    id: 'fee-policy',
    title: 'Read fee policy',
    description: 'Inspect any fee policy the public operator publishes.',
    select: (info) => ({ feePolicy: info.fees ?? 'Not reported by this operator response' }),
  },
  {
    id: 'session-schedule',
    title: 'Read session schedule',
    description: 'Inspect any next-session metadata the public operator publishes.',
    select: (info) => ({ sessionSchedule: info.scheduledSession ?? 'Not reported by this operator response' }),
  },
];

export async function runOperation(operationId, fetchImpl = fetch) {
  const operation = arkadeOperations.find(({ id }) => id === operationId);
  if (!operation) throw new Error(`Unknown Arkade operation: ${operationId}`);

  const operator = await fetchOperatorInfo(fetchImpl);
  const backendReachable = operator.status === 'online' ? 'yes' : 'no';
  const output = operator.status === 'online'
    ? operation.select(operator.info)
    : { endpoint: signetInfoUrl, httpStatus: operator.statusCode, error: operator.message };

  return {
    id: operation.id,
    backendReachable,
    message: operator.message,
    output: JSON.stringify(output, null, 2),
  };
}
