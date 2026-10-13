import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyPolarWebhook } from '../lib/polar-webhook.ts';
const secret = `whsec_${Buffer.from('homie-test-secret-not-a-live-key').toString('base64')}`;
const body = JSON.stringify({type:'subscription.active',data:{id:'test'}});
function headers(key) {
 const id='test-event'; const timestamp=String(Math.floor(Date.now()/1000));
 return {'webhook-id':id,'webhook-timestamp':timestamp,'webhook-signature':`v1,${createHmac('sha256',key).update(`${id}.${timestamp}.${body}`).digest('base64')}`};
}
test('verifies current and legacy Polar signing schemes',()=>{
 for(const key of [Buffer.from(secret.slice(6),'base64'),Buffer.from(secret)]) assert.equal(verifyPolarWebhook(body,headers(key),secret).type,'subscription.active');
});
test('rejects tampered payloads and unrelated signing keys',()=>{
 assert.throws(()=>verifyPolarWebhook(body+' ',headers(Buffer.from(secret.slice(6),'base64')),secret));
 assert.throws(()=>verifyPolarWebhook(body,headers(Buffer.from('wrong-key')),secret));
});
