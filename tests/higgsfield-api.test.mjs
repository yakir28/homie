import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHiggsfieldClient, higgsfieldInput, higgsfieldModel } from '../lib/higgsfield-api.mjs';
import { makeKlingShotPlan } from '../lib/kling-shot-plan.mjs';
const json = data => new Response(JSON.stringify(data));
const credentials = { keyId: 'test-id', keySecret: 'test-secret', sleep: async () => {} };
const args = { model: higgsfieldModel('1080p'), body: {}, idempotencyKey: 'stable', onSubmitted: async () => {} };
test('Higgsfield authenticates, persists submission before polling and returns video', async () => {
  const calls=[];let saved=false;
  const client=createHiggsfieldClient({...credentials,fetchImpl:async(url,init)=>{calls.push({url:String(url),init});if(calls.length===1)return json({request_id:'task',status:'queued',status_url:'https://api.higgsfield.ai/requests/task/status'});assert.ok(saved);return json({status:'completed',video:{url:'https://cdn.example.com/video.mp4'}});}});
  const result=await client.run({...args,onSubmitted:async()=>{saved=true;}});
  assert.equal(result.jobId,'task');assert.equal(calls[0].init.headers.Authorization,'Key test-id:test-secret');assert.equal(calls[0].init.headers['Idempotency-Key'],'stable');assert.equal(calls[1].init.method,'GET');
});
test('resume uses only saved task, never a second generation',async()=>{
  const client=createHiggsfieldClient({...credentials,fetchImpl:async(_url,init)=>{assert.equal(init.method,'GET');return json({status:'completed',video:{url:'https://cdn.example.com/video.mp4'}});}});
  await client.run({...args,taskId:'existing',previouslySubmitted:true});
  await assert.rejects(client.run({...args,previouslySubmitted:true}),/Reconcile/);
});
test('upload forwards storage headers but never API credentials',async()=>{
 let calls=0;const client=createHiggsfieldClient({...credentials,fetchImpl:async(_url,init)=>{if(++calls===1)return json({upload_url:'https://storage.example.com/upload',public_url:'https://cdn.example.com/photo.jpg',upload_headers:{'Content-Type':'image/jpeg','x-amz-tagging':'retention=temporary'}});assert.equal(init.headers.Authorization,undefined);assert.equal(init.headers['x-amz-tagging'],'retention=temporary');return new Response('');}});
 assert.equal(await client.upload(new Uint8Array([1,2])),'https://cdn.example.com/photo.jpg');
});
test('refuses foreign status URLs before sending credentials',async()=>{
 const client=createHiggsfieldClient({...credentials,fetchImpl:async()=>{throw new Error('Must not fetch');}});
 await assert.rejects(client.run({...args,taskId:'x',statusUrl:'https://evil.example/status'}),/Invalid Higgsfield API URL/);
});
test('failed generation surfaces without retrying submission',async()=>{
 let calls=0;const client=createHiggsfieldClient({...credentials,fetchImpl:async()=>{calls++;return json({request_id:'x',status:'failed'});}});
 await assert.rejects(client.run(args),/failed/);assert.equal(calls,1);
});
test('transient polling error retries GET only',async()=>{
 let calls=0;const client=createHiggsfieldClient({...credentials,fetchImpl:async(_u,init)=>{calls++;if(calls===1)return json({request_id:'x',status:'queued'});assert.equal(init.method,'GET');return calls===2?new Response('',{status:503}):json({status:'completed',video:{url:'https://cdn.example.com/v.mp4'}});}});
 await client.run(args);assert.equal(calls,3);
});
const templates=JSON.parse(readFileSync(new URL('./fixtures/active-video-templates.json',import.meta.url)));
for(const t of templates)test(`Higgsfield payload: ${t.slug}`,()=>{
 for(const resolution of ['720p','1080p','4k']){
 const shots=makeKlingShotPlan({duration_seconds:t.duration_seconds,output_format:t.format,template_prompt_snapshot:{...t.generation_config,template_slug:t.slug,kling_resolution:resolution,user_prompt:'A calm cinematic property tour.'}},Array.from({length:t.min_photos},(_,i)=>({path:`photo-${i}`})));
 for(const shot of shots){const body=higgsfieldInput(shot,'https://cdn.example/first',shot.endPath?'https://cdn.example/last':undefined);assert.equal(body.prompt,shot.prompt);assert.equal(body.duration,shot.duration);assert.equal(body.sound,shot.generateAudio?'on':'off');assert.equal(Boolean(body.last_image_url),Boolean(shot.endPath));assert.match(higgsfieldModel(resolution),/image-to-video$/);}
 }
});

test('Omni reference endpoint submits references without frame parameters',async()=>{
 const {makeReferencePlan,referenceInput}=await import('../lib/higgsfield-reference.mjs');
 const shot=makeReferencePlan({duration_seconds:15,output_format:'16:9',template_prompt_snapshot:{workflow:'prompt_property_film',user_prompt:'Quiet property tour'}},[{path:'home'}])[0];
 const client=createHiggsfieldClient({...credentials,fetchImpl:async(url,init)=>{
 assert.equal(String(url),'https://api.higgsfield.ai/kling-video/o3/image-reference');
 const body=JSON.parse(init.body);assert.deepEqual(body.image_urls,['https://cdn.example/home.jpg']);assert.equal(body.first_frame_url,undefined);
 return json({request_id:'omni',status:'completed',video:{url:'https://cdn.example/video.mp4'}});
 }});
 const result=await client.run({...args,model:shot.model,body:referenceInput(shot,['https://cdn.example/home.jpg'])});assert.equal(result.jobId,'omni');
});

test('validation errors retain safe provider diagnostics and correlation ID',async()=>{
 const client=createHiggsfieldClient({...credentials,fetchImpl:async()=>new Response(JSON.stringify({detail:"'multi_prompt' is a required property test-secret https://cdn.example/private?token=abc"}),{status:400,headers:{'X-Correlation-ID':'trace-id'}})});
 await assert.rejects(client.run(args),error=>{
 assert.match(error.message,/multi_prompt/);assert.doesNotMatch(error.message,/test-secret|token=abc/);assert.equal(error.correlationId,'trace-id');assert.equal(error.status,400);return true;
 });
});

test('accepted request survives an untrusted provider status link without leaking credentials',async()=>{
 for(const link of ['http://api.higgsfield.ai/requests/accepted/status','https://foreign.example/status','https://user:pass@api.higgsfield.ai/status']){
 let saved=false;let calls=0;
 const client=createHiggsfieldClient({...credentials,fetchImpl:async(url,init)=>{
  calls++;
  if(calls===1)return json({request_id:'accepted',status:'queued',status_url:link});
  assert.ok(saved);assert.equal(String(url),'https://api.higgsfield.ai/requests/accepted/status');assert.equal(init.method,'GET');
  return json({status:'completed',video:{url:'https://cdn.example/film.mp4'}});
 }});
 const result=await client.run({...args,onSubmitted:async(id,url)=>{assert.equal(id,'accepted');assert.equal(url,'https://api.higgsfield.ai/requests/accepted/status');saved=true;}});
 assert.equal(result.jobId,'accepted');assert.equal(calls,2);
 }
});

test('temporary polling network failure never resubmits generation',async()=>{
 let calls=0;let submissions=0;
 const client=createHiggsfieldClient({...credentials,fetchImpl:async(_url,init)=>{
 calls++;if(init.method==='POST'){submissions++;return json({request_id:'existing',status:'queued'});}
 if(calls===2)throw new TypeError('fetch failed');
 return json({status:'completed',video:{url:'https://cdn.example/complete.mp4'}});
 }});
 await client.run(args);assert.equal(submissions,1);assert.equal(calls,3);
});
