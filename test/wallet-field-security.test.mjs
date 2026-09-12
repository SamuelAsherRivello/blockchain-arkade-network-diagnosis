import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('uses a true password field and does not persist recovery phrases', async () => {
  const [html, source] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /<input id="recovery-phrase" type="password"[^>]*autocomplete="off"/);
  assert.doesNotMatch(`${html}\n${source}`, /localStorage|sessionStorage/);
});
