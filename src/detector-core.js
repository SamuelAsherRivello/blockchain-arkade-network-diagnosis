export const signetInfoUrl = 'https://signet.arkade.sh/v1/info';

export function normalizeRecoveryPhrase(value) {
  const phrase = String(value).trim().replace(/\s+/g, ' ');
  if (!phrase) throw new Error('Enter a recovery phrase with spaces between words.');
  return phrase;
}

export function operatorResult({ ok, status, info }) {
  if (!ok) return { status: 'unavailable', message: `Arkade Signet returned HTTP ${status}.` };
  if (info?.network !== 'signet') return { status: 'unavailable', message: `Expected Arkade Signet but received ${info?.network ?? 'an invalid response'}.` };
  return { status: 'online', message: 'Arkade Signet is reachable.' };
}
