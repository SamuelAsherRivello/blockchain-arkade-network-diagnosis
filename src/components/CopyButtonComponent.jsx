import { useEffect, useRef, useState } from 'react';

function copyWithFallback(value) {
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand('copy');
  textArea.remove();
  if (!copied) throw new Error('The browser could not copy this value.');
}

export function CopyButtonComponent({ value, label }) {
  const [status, setStatus] = useState('idle');
  const resetTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else copyWithFallback(value);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus('idle'), 1800);
  }

  const statusText = status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : '';
  return (
    <button type="button" className={`copy-button ${status}`} onClick={handleCopy} aria-label={`Copy ${label}`} title={`Copy ${label}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
      <span className="copy-button-status" aria-live="polite">{statusText}</span>
    </button>
  );
}
