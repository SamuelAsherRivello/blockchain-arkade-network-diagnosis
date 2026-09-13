import { defaultNetwork, getArkadeNetwork, operatorInfoUrl } from './detector-core.js';
import { fetchOperatorInfo } from './operator.js';

export function createArkadeOperations(network = defaultNetwork) {
  const selected = getArkadeNetwork(network);
  return [
  {
    id: 'operator-info',
    title: 'Read operator information',
    description: 'Fetch the operator identity and supported network.',
    docsHref: 'https://docs.arkadeos.com/arkd/core-services/ark-service',
    docsTooltip: 'Read more about Arkade operators',
    select: (info) => ({ endpoint: operatorInfoUrl(network), network: info.network, protocol: info.protocol ?? 'Not reported' }),
  },
  {
    id: 'network-verification',
    title: `Verify ${selected.label} network`,
    description: `Confirm this public endpoint identifies itself as ${selected.label}.`,
    docsHref: 'https://docs.arkadeos.com/wallets/getting-started/developer-resources',
    docsTooltip: 'Read more about Arkade development networks',
    select: (info) => ({ expectedNetwork: network, receivedNetwork: info.network, verified: info.network === network }),
  },
  {
    id: 'fee-policy',
    title: 'Read fee policy',
    description: 'Inspect any fee policy the public operator publishes.',
    docsHref: 'https://docs.arkadeos.com/learn/core-concepts/settlement-and-finality',
    docsTooltip: 'Read more about Arkade fees and settlement',
    select: (info) => ({ feePolicy: info.fees ?? 'Not reported by this operator response' }),
  },
  {
    id: 'session-schedule',
    title: 'Read session schedule',
    description: 'Inspect any next-session metadata the public operator publishes.',
    docsHref: 'https://docs.arkadeos.com/wallets/advanced/settlement-process',
    docsTooltip: 'Read more about Arkade settlement',
    select: (info) => ({ sessionSchedule: info.scheduledSession ?? 'Not reported by this operator response' }),
  },
  ];
}

export const arkadeOperations = createArkadeOperations();

export async function runOperation(operationId, network = defaultNetwork, fetchImpl = fetch) {
  const operation = createArkadeOperations(network).find(({ id }) => id === operationId);
  if (!operation) throw new Error(`Unknown Arkade operation: ${operationId}`);

  const operator = await fetchOperatorInfo(network, fetchImpl);
  const backendReachable = operator.status === 'online' ? 'yes' : 'no';
  const output = operator.status === 'online'
    ? operation.select(operator.info)
    : { endpoint: operatorInfoUrl(network), httpStatus: operator.statusCode, error: operator.message };

  return {
    id: operation.id,
    backendReachable,
    message: operator.message,
    output: JSON.stringify(output, null, 2),
  };
}
