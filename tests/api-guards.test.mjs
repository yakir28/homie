import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual handlers with external services disabled. Invalid requests
// must terminate before any database or provider access.
function loadModule(url) {
  const source = readFileSync(url, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext({ exports: {}, Request, Response, process: { env: {} },
    require: (name) => name === 'cloudflare:workers' ? { env: {} }
      : name.endsWith('/supabase/server-auth') ? loadModule(new URL(`${name}.ts`, url)) : new Proxy({}, {
      get: () => () => { throw new Error(`Unexpected dependency access: ${name}`); },
    }),
  });
  vm.runInContext(code, context);
  return context.exports;
}

const handler = path => loadModule(new URL(`../app${path}/route.ts`, import.meta.url)).POST;

for (const path of ['/api/director/chat', '/api/media/video-url', '/api/billing/checkout']) {
  test(`${path} refuses unauthenticated requests`, async () => {
    const response = await handler(path)(new Request(`https://homie.test${path}`, { method: 'POST', body: '{}' }));
    assert.equal(response.status, 401);
  });
}
for (const body of ['{', 'null', '[]', '{}', '{"projectId":-1}']) {
  test(`video access rejects malformed input: ${body}`, async () => {
    const response = await handler('/api/media/video-url')(new Request('https://homie.test/api/media/video-url', {
      method: 'POST', headers: { authorization: 'Bearer invalid-test-token', 'content-type': 'application/json' }, body,
    }));
    assert.equal(response.status, 400);
  });
}
