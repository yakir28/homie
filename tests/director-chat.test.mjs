import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDirectorReply, directorInstructions } from '../lib/director-chat.ts';
test('accepts a clarifying question without a generation brief',()=>{
 assert.deepEqual(parseDirectorReply({answer:'Which property should we use?',brief:null,ready:false}),{answer:'Which property should we use?',brief:null,ready:false});
});
test('ready replies require a usable bounded brief',()=>{
 for(const brief of [null,'','x'.repeat(2001)]) assert.throws(()=>parseDirectorReply({answer:'Ready',brief,ready:true}));
 assert.equal(parseDirectorReply({answer:'Here is the direction.',brief:'Preserve the home and use the references in order.',ready:true}).ready,true);
});
test('rejects malformed provider responses',()=>{
 for(const value of [null,{}, {answer:42,brief:null,ready:false},{answer:'',brief:null,ready:false},{answer:'Ready',brief:'Film',ready:'true'}]) assert.throws(()=>parseDirectorReply(value));
});
test('director knows generation limits and does not pretend to have rendered',()=>{
 assert.match(directorInstructions,/15 or 30 seconds/);
 assert.match(directorInstructions,/never claim generation has started or finished/);
 assert.match(directorInstructions,/saved chronological order/);
});
