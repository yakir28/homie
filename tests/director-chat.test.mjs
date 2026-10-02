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

test('conversation settings are validated and preserved for rendering', async () => {
 const { validateDirectorSelection } = await import('../lib/director-chat.ts');
 const reply = parseDirectorReply({ answer:'A short vertical tour.', brief:'15-second vertical tour.', ready:true, context:{listingId:'12',duration:15,aspectRatio:'9:16'} });
 assert.deepEqual(validateDirectorSelection(reply,[{id:12,listing_photos:[{count:4}]}]).context,{listingId:'12',duration:15,aspectRatio:'9:16'});
 assert.throws(()=>validateDirectorSelection(reply,[{id:13,listing_photos:[{count:4}]}]));
 for (const count of [0,31]) assert.equal(validateDirectorSelection(reply,[{id:12,listing_photos:[{count}]}]).ready,false);
});
test('rejects unsupported conversational settings',()=>{
 for (const context of [{listingId:'12',duration:60,aspectRatio:'9:16'},{listingId:'12',duration:15,aspectRatio:'4K'},{listingId:'other-user',duration:15,aspectRatio:'16:9'}]) {
  assert.throws(()=>parseDirectorReply({answer:'Ready',brief:'Tour',ready:true,context}));
 }
});
test('no property keeps a conversation open without enabling rendering',async()=>{
 const { validateDirectorSelection } = await import('../lib/director-chat.ts');
 const reply=parseDirectorReply({answer:'Which home?',brief:'Tour',ready:true,context:{listingId:null,duration:30,aspectRatio:'16:9'}});
 assert.equal(validateDirectorSelection(reply,[]).ready,false);
});
