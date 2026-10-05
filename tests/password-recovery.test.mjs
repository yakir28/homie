import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/password-recovery.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { readRecoveryTokens, validateNewPassword } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

test('only a complete recovery callback unlocks the reset form', () => {
  assert.deepEqual(readRecoveryTokens('#type=recovery&access_token=access&refresh_token=refresh'), { access_token: 'access', refresh_token: 'refresh' });
  for (const hash of ['', '#type=signup&access_token=a&refresh_token=b', '#type=recovery&access_token=a', '#type=recovery&access_token=a&refresh_token=b&error=access_denied']) {
    assert.equal(readRecoveryTokens(hash), null);
  }
});

test('password validation rejects short or mismatched passwords without trimming', () => {
  assert.ok(validateNewPassword('short', 'short'));
  assert.ok(validateNewPassword('new-password', 'other-password'));
  assert.ok(validateNewPassword('new-password ', 'new-password'));
  assert.equal(validateNewPassword('new-password', 'new-password'), null);
});
