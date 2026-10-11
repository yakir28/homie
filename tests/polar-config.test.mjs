import test from 'node:test';
import assert from 'node:assert/strict';
import { polarSetting, polarProductId, polarPlanSlugFromProduct } from '../lib/polar.ts';

test('sandbox selects separate products and never falls back to production secrets', () => {
  const keys = ['POLAR_SERVER', 'POLAR_ACCESS_TOKEN', 'POLAR_SANDBOX_ACCESS_TOKEN', 'POLAR_PRODUCT_STARTER', 'POLAR_SANDBOX_PRODUCT_STARTER'];
  const saved = new Map(keys.map(key => [key, process.env[key]]));
  try {
    process.env.POLAR_SERVER = 'sandbox';
    process.env.POLAR_ACCESS_TOKEN = 'live-test-placeholder';
    process.env.POLAR_PRODUCT_STARTER = 'live-product';
    delete process.env.POLAR_SANDBOX_ACCESS_TOKEN;
    delete process.env.POLAR_SANDBOX_PRODUCT_STARTER;
    assert.equal(polarSetting('ACCESS_TOKEN'), undefined);
    assert.equal(polarProductId('starter'), undefined);
    process.env.POLAR_SANDBOX_PRODUCT_STARTER = 'sandbox-product';
    assert.equal(polarProductId('starter'), 'sandbox-product');
    assert.equal(polarPlanSlugFromProduct('live-product'), null);
    process.env.POLAR_SERVER = 'production';
    assert.equal(polarProductId('starter'), 'live-product');
    assert.equal(polarPlanSlugFromProduct('sandbox-product'), null);
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
