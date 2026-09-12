import { defaultNetwork, getArkadeNetwork } from './detector-core.js';

const preferenceKey = 'arkade-network-api-diagnostics:network:v1';

export function loadNetworkPreference() {
  try {
    const network = globalThis.localStorage?.getItem(preferenceKey) ?? defaultNetwork;
    getArkadeNetwork(network);
    return network;
  } catch {
    return defaultNetwork;
  }
}

export function saveNetworkPreference(network) {
  getArkadeNetwork(network);
  globalThis.localStorage?.setItem(preferenceKey, network);
}
