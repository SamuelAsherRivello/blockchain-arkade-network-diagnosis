import { InMemoryContractRepository, InMemoryWalletRepository, MnemonicIdentity, ReadonlyWallet, RestArkProvider } from '@arkade-os/sdk';
import { normalizeRecoveryPhrase, operatorResult, signetInfoUrl } from './detector-core.js';

const timeoutMs = 15_000;

export async function checkOperator(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(signetInfoUrl, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const info = await response.json();
    return { ...operatorResult({ ok: response.ok, status: response.status, info }), info };
  } catch {
    return { status: 'unavailable', message: 'Arkade Signet could not be reached from this browser.' };
  }
}

export async function addWallet(phraseInput) {
  const phrase = normalizeRecoveryPhrase(phraseInput);
  const operator = await checkOperator();
  if (operator.status !== 'online') throw new Error(operator.message);

  let wallet;
  try {
    const identity = await MnemonicIdentity.fromMnemonic(phrase, { isMainnet: false }).toReadonly();
    wallet = await ReadonlyWallet.create({
      identity,
      arkProvider: new RestArkProvider('https://signet.arkade.sh'),
      storage: { walletRepository: new InMemoryWalletRepository(), contractRepository: new InMemoryContractRepository() },
    });
    const arkadeAddress = await wallet.getAddress();
    if (!arkadeAddress.startsWith('tark1')) throw new Error('The recovery phrase did not produce a Signet Arkade address.');
    return { arkadeAddress, operator };
  } finally {
    await wallet?.dispose();
  }
}
