import assert from 'node:assert/strict';
import test from 'node:test';

const { default: worker } = await import('../dist/server/index.js');
const bindings = { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } };
const context = { waitUntil() {}, passThroughOnException() {} };
const request = (path, options = {}) => worker.fetch(new Request(`http://localhost${path}`, options), bindings, context);

for (const [path, expected] of [
  ['/', /Create hyper-realistic videos for your properties/],
  ['/login', /Welcome/],
  ['/terms', /Terms/],
  ['/privacy', /Privacy/],
]) {
  test(`renders Homie ${path}`, async () => {
    const response = await request(path, { headers: { accept: 'text/html' } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, /Homie/);
    assert.match(html, expected);
    assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
  });
}
