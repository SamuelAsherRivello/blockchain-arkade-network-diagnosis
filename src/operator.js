import { defaultNetwork, getArkadeNetwork, operatorInfoUrl, operatorResult } from './detector-core.js';

const timeoutMs = 15_000;

export async function fetchOperatorInfo(network = defaultNetwork, fetchImpl = fetch) {
  const selected = getArkadeNetwork(network);
  try {
    const response = await fetchImpl(operatorInfoUrl(network), {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const info = await response.json();
    return {
      ...operatorResult({ ok: response.ok, status: response.status, info, expectedNetwork: network }),
      info,
      statusCode: response.status,
    };
  } catch {
    return {
      status: 'unavailable',
      message: `Arkade ${selected.label} could not be reached from this browser.`,
      info: null,
      statusCode: null,
    };
  }
}

export const checkOperator = fetchOperatorInfo;
