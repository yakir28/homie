import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePolarCreditOrder as parse } from '../lib/polar-credit-order.ts';
import { creditPack } from '../lib/credit-packs.ts';
const event=()=>({type:'order.paid',data:{id:'order',product_id:'pack',subscription_id:null,customer:{external_id:'workspace:1'},net_amount:2200,refunded_amount:0,currency:'usd',paid:true}});
test('credit catalog rejects client prices and arbitrary amounts',()=>{
 assert.equal(creditPack(60).price,22);assert.equal(creditPack(90).price,20);assert.equal(creditPack('60'),undefined);assert.equal(creditPack(9999),undefined);
});
test('only one-time paid or refund events produce fulfillment',()=>{
 assert.equal(parse(event()).paid,true);const e=event();e.type='order.refunded';e.data.refunded_amount=1100;assert.equal(parse(e).paid,false);
 e.data.subscription_id='subscription';assert.equal(parse(e),null);assert.equal(parse({type:'checkout.updated'}),null);
});
test('unpaid, malformed and invalid currency orders fail closed',()=>{
 for(const patch of [{paid:false},{currency:'eur'},{net_amount:0},{net_amount:NaN},{refunded_amount:-1},{customer:null}]){const e=event();Object.assign(e.data,patch);assert.throws(()=>parse(e));}
});
