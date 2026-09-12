import { InMemoryContractRepository, InMemoryWalletRepository, MnemonicIdentity, ReadonlyWallet, RestArkProvider } from '@arkade-os/sdk';
import { normalizeRecoveryPhrase } from './detector-core.js';
import { checkOperator } from './operator.js';

export { checkOperator } from './operator.js';

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
