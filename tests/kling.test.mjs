import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { makeKlingShotPlan, klingRequest } from "../lib/kling-shot-plan.mjs";
import { createKlingClient } from "../lib/kling-client.mjs";
const templates = JSON.parse(await readFile(new URL("./fixtures/active-video-templates.json", import.meta.url)));
const response = (data) => new Response(JSON.stringify({ code: 0, data }), { status: 200 });
const done = { id: "task-1", external_id: "external-1", status: "succeeded", outputs: [{ type: "video", url: "https://example.com/video.mp4", duration: "5" }] };
for (const template of templates) test(`Kling: ${template.name} preserves references and fits the API`, () => {
  for (const count of [template.min_photos, template.max_photos]) {
    const photos = Array.from({length: count},(_,i)=>({path:`/photo-${i}.jpg`}));
    const shots = makeKlingShotPlan({ duration_seconds: template.duration_seconds, output_format: template.format, template_prompt_snapshot: { ...template.generation_config, template_slug: template.slug, user_prompt: "Make this a warm cinematic tour." } }, photos);
    assert.ok(Math.abs(shots.reduce((n,s)=>n+s.editDuration,0)-template.duration_seconds)<0.001);
    const used = new Set(shots.flatMap(s=>[s.startPath,s.endPath]).filter(Boolean));
    assert.deepEqual(used, new Set(photos.map(p=>p.path)));
    for(const shot of shots) {
      assert.ok(shot.duration>=3 && shot.duration<=15);
      assert.ok(shot.prompt.length<=3072);
      assert.equal(shot.provider,"kling");
      assert.equal(shot.model,"kling-3.0");
      assert.ok(shot.startPath);
      const body=klingRequest(shot,"base64-first",shot.endPath?"base64-last":undefined);
      assert.equal(body.contents[0].text,shot.prompt);
      assert.equal(body.settings.audio,shot.generateAudio?"native":"off");
      if(template.generation_config.shots) {
        const recipe=template.generation_config.shots.find(s=>s.role===shot.role);
        if(recipe) assert.ok(shot.prompt.includes(recipe.prompt));
      }
    }
  }
});

test("Kling saves task ID before polling and uses Bearer authentication",async()=>{
  const events=[];
  const client=createKlingClient({apiKey:"test-only-key",sleep:async()=>{},fetchImpl:async(url,options)=>{
    assert.equal(options.headers.Authorization,"Bearer test-only-key");
    if(options.method==="POST") {events.push("submit");assert.equal(new URL(url).pathname,"/image-to-video/kling-3.0");return response({id:"task-1",status:"submitted"});}
    events.push("poll");return response([done]);
  }});
  const result=await client.run({body:{contents:[]},externalId:"external-1",onSubmitted:async()=>{events.push("save");}});
  assert.deepEqual(events,["submit","save","poll"]);assert.equal(result.jobId,"task-1");
});
test("Kling resumes a stored task without creating another paid job",async()=>{
  const client=createKlingClient({apiKey:"test",fetchImpl:async(url,options)=>{assert.equal(options.method,"GET");return response([done]);}});
  const result=await client.run({externalId:"external-1",taskId:"task-1",onSubmitted:async()=>{}});
  assert.equal(result.outputUrl,done.outputs[0].url);
});
test("Kling reconciles a lost submission response by its external ID",async()=>{
  const client=createKlingClient({apiKey:"test",fetchImpl:async(url,options)=>{assert.equal(options.method,"GET");assert.match(String(url),/external_task_ids=external-1/);return response([done]);}});
  await client.run({externalId:"external-1",previouslySubmitted:true,onSubmitted:async()=>{}});
});
test("unknown submission outcomes are never automatically resubmitted",async()=>{
  let calls=0;
  const client=createKlingClient({apiKey:"secret-test",fetchImpl:async()=>{calls++;throw new Error("secret-test");}});
  await assert.rejects(()=>client.run({body:{},externalId:"external-1",onSubmitted:async()=>{}}),e=>e.recoverable && !e.message.includes("secret-test"));
  assert.equal(calls,1);
  const missing=createKlingClient({apiKey:"test",fetchImpl:async(_url,options)=>{assert.equal(options.method,"GET");return response([]);}});
  await assert.rejects(()=>missing.run({externalId:"external-1",previouslySubmitted:true,onSubmitted:async()=>{}}),/no new generation/);
});
test("Kling errors omit secrets and never follow credential-bearing redirects",async()=>{
  assert.throws(()=>createKlingClient({apiKey:""}),/KLING_API_KEY/);
  assert.throws(()=>createKlingClient({apiKey:"test",baseUrl:"https://example.com"}),/host/);
  const client=createKlingClient({apiKey:"secret-test",fetchImpl:async(_url,options)=>{assert.equal(options.redirect,"error");return new Response("secret-test",{status:401});}});
  await assert.rejects(()=>client.checkAccess(),e=>e.message.includes("401")&&!e.message.includes("secret-test"));
});
test("failed task and polling timeout preserve a recoverable ID without retries",async()=>{
  const failed=createKlingClient({apiKey:"test",fetchImpl:async()=>response([{...done,status:"failed"}])});
  await assert.rejects(()=>failed.run({externalId:"external-1",taskId:"task-1",onSubmitted:async()=>{}}),/could not generate/);
  const timed=createKlingClient({apiKey:"test",timeoutMs:0,fetchImpl:async()=>response([{...done,status:"processing"}])});
  await assert.rejects(()=>timed.run({externalId:"external-1",taskId:"task-1",onSubmitted:async()=>{}}),e=>e.recoverable);
});
