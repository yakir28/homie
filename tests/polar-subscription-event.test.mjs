import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePolarSubscriptionEvent as parse } from '../lib/polar-subscription-event.ts';
const event = (status='active', type='subscription.updated') => ({type,timestamp:'2026-10-10T12:00:00Z',data:{id:'sub',product_id:'product',customer_id:'customer',status,recurring_interval:'month',current_period_start:'2026-10-10T00:00:00Z',current_period_end:'2026-11-10T00:00:00Z',cancel_at_period_end:false,customer:{external_id:'workspace:1'}}});
test('renewal updated snapshots grant allowance, trials and failed payments do not',()=>{
 assert.equal(parse(event()).grantAllowance,true);
 for(const status of ['trialing','past_due','unpaid','paused','canceled'])assert.equal(parse(event(status)).grantAllowance,false);
});
test('scheduled cancellation retains paid access, actual cancellation expires',()=>{
 const e=event('active','subscription.canceled');e.data.cancel_at_period_end=true;
 assert.equal(parse(e).status,'active');assert.equal(parse(event('canceled','subscription.revoked')).status,'expired');
});
test('malformed subscriptions fail closed; unrelated events are ignored',()=>{
 assert.equal(parse({type:'order.paid'}),null);
 for(const patch of [{customer:null},{status:'unknown'},{recurring_interval:'week'},{current_period_end:null},{id:42}]){
 const e=event();Object.assign(e.data,patch);assert.throws(()=>parse(e));
 }
 assert.throws(()=>parse(null));
});
