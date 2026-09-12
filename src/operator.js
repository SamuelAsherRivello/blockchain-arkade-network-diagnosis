import { operatorResult, signetInfoUrl } from './detector-core.js';

const timeoutMs = 15_000;

export async function fetchOperatorInfo(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(signetInfoUrl, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const info = await response.json();
    return {
      ...operatorResult({ ok: response.ok, status: response.status, info }),
      info,
      statusCode: response.status,
    };
  } catch {
    return {
      status: 'unavailable',
      message: 'Arkade Signet could not be reached from this browser.',
      info: null,
      statusCode: null,
    };
  }
}

export const checkOperator = fetchOperatorInfo;
