import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeReferencePlan,referenceInput,REFERENCE_MODEL} from '../lib/higgsfield-reference.mjs';
const templates=JSON.parse(readFileSync(new URL('./fixtures/active-video-templates.json',import.meta.url)));
for(const t of templates)test(`Omni reference: ${t.slug}`,()=>{
 for(const count of [t.min_photos,t.max_photos]){
 const photos=Array.from({length:count},(_,i)=>({path:`photo-${i}`}));
 const shots=makeReferencePlan({duration_seconds:t.duration_seconds,output_format:t.format,template_prompt_snapshot:{...t.generation_config,kling_resolution:'1080p',user_prompt:'Warm cinematic tour'}},photos);
 assert.equal(shots.reduce((n,s)=>n+s.duration,0),t.duration_seconds);
 assert.deepEqual([...new Set(shots.flatMap(s=>s.referencePaths))],photos.map(p=>p.path));
 for(const shot of shots){assert.equal(shot.model,REFERENCE_MODEL);assert.ok(shot.duration>=3 && shot.duration<=15);const body=referenceInput(shot,shot.referencePaths);assert.ok(body.image_urls.length<=7);assert.equal(body.mode,'pro');assert.equal(body.first_frame_url,undefined);assert.equal(body.last_frame_url,undefined);assert.equal(shot.startPath,null);}
 }
});
test('30s tour uses two 15s chapters with six photos, without extra billable seconds',()=>{
 const shots=makeReferencePlan({duration_seconds:30,output_format:'16:9',template_prompt_snapshot:{workflow:'prompt_property_film',user_prompt:'Calm tour'}},Array.from({length:6},(_,i)=>({path:`p${i}`})));
 assert.deepEqual(shots.map(s=>s.duration),[15,15]);assert.deepEqual(shots.map(s=>s.referencePaths.length),[3,3]);assert.match(shots[1].prompt,/do not repeat the opening/);
});
test('large albums preserve all references within the same runtime',()=>{
 const shots=makeReferencePlan({duration_seconds:30,output_format:'4:3',template_prompt_snapshot:{workflow:'prompt_property_film',user_prompt:'Calm tour'}},Array.from({length:30},(_,i)=>({path:`p${i}`})));
 assert.equal(shots.length,5);assert.equal(shots.reduce((n,s)=>n+s.duration,0),30);assert.equal(referenceInput(shots[0],shots[0].referencePaths).aspect_ratio,'16:9');
});

test('rejects impossible short albums before submission',()=>{
 assert.throws(()=>makeReferencePlan({duration_seconds:3,output_format:'16:9',template_prompt_snapshot:{}},Array.from({length:8},(_,i)=>({path:`p${i}`}))),/Too many references/);
});
test('one-photo long films repeat the anchor with exact runtime and valid tiers',()=>{
 for(const [resolution,mode] of [['720p','std'],['1080p','pro'],['4k','4k']]){
 const shots=makeReferencePlan({duration_seconds:31,output_format:'9:16',template_prompt_snapshot:{workflow:'prompt_property_film',user_prompt:'Slow architectural study',kling_resolution:resolution}},[{path:'house'}]);
 assert.deepEqual(shots.map(s=>s.duration),[11,10,10]);
 for(const shot of shots){assert.deepEqual(shot.referencePaths,['house']);assert.equal(referenceInput(shot,['url']).mode,mode);assert.throws(()=>referenceInput(shot,[]),/Missing reference/);}
 }
});

test('reference payload follows the official conditional prompt schema',()=>{
 const schema=JSON.parse(readFileSync(new URL('./fixtures/higgsfield-omni-input-schema.json',import.meta.url)));
 const shots=makeReferencePlan({duration_seconds:30,output_format:'16:9',template_prompt_snapshot:{workflow:'prompt_property_film',user_prompt:'Tour each room'}},Array.from({length:6},(_,i)=>({path:`p${i}`})));
 for(const shot of shots){
  const body=referenceInput(shot,shot.referencePaths);
  assert.equal(body.multi_shots,false,'Multiple references must not enable explicit multi-shot mode');
  const branch=body.multi_shots===schema.if.properties.multi_shots.const?schema.then:schema.else;
  for(const key of branch.required) assert.ok(key in body,`Missing ${key}`);
  assert.equal(body.prompt,shot.prompt);
  assert.equal(body.image_urls.length,3);
 }
 assert.deepEqual(schema.then.required,['multi_prompt']);
});

const {templateDirections}=await import('../lib/video-prompts/template-directions.mjs');
for(const [slug,recipe] of Object.entries(templateDirections))test(`adaptive effect survives without demo property: ${slug}`,()=>{
 const project={duration_seconds:30,output_format:'9:16',template_prompt_snapshot:{reference_planner_version:2,creative_recipe:recipe,director_prompt:Object.values(recipe).join('\n'),base_prompt:'FORBIDDEN_DEMO_VILLA'}};
 const shots=makeReferencePlan(project,[{path:'interior-a'},{path:'interior-b'}]);
 assert.match(shots[0].prompt,/Opening chapter/);
 assert.ok(shots[0].prompt.includes(recipe.opening));
 assert.ok(!shots[1].prompt.includes(recipe.opening));
 assert.ok(shots[1].prompt.includes(recipe.treatment));
 assert.doesNotMatch(shots[0].prompt,/FORBIDDEN_DEMO_VILLA/);
 assert.match(shots[0].prompt,/even if absent from the photographs/);
 assert.deepEqual(shots.map(s=>s.duration),[15,15]);
 assert.deepEqual(shots.flatMap(s=>s.referencePaths),['interior-a','interior-b']);
});
test('adaptive recipe is snapshot gated; legacy jobs retain their prompts',()=>{
 const p={duration_seconds:5,output_format:'16:9',template_prompt_snapshot:{director_prompt:'LEGACY_DIRECTION'}};
 assert.match(makeReferencePlan(p,[{path:'a'}])[0].prompt,/LEGACY_DIRECTION/);
 p.template_prompt_snapshot.reference_planner_version=2;
 assert.throws(()=>makeReferencePlan(p,[{path:'a'}]),/Missing adaptive/);
});
test('Wan 3.0 Prime generates a 30s film from up to 10 references in one native-ratio request',()=>{
 const snapshot={workflow:'prompt_property_film',user_prompt:'Calm tour',video_model:'wan-3.0-prime',kling_resolution:'1080p'};
 const [shot,...rest]=makeReferencePlan({duration_seconds:30,output_format:'3:4',template_prompt_snapshot:snapshot},Array.from({length:10},(_,i)=>({path:`p${i}`})));
 assert.equal(rest.length,0);assert.equal(shot.model,'alibaba/wan-3.0-prime/reference-to-video');assert.equal(shot.duration,30);
 const body=referenceInput(shot,shot.referencePaths);
 assert.deepEqual(Object.keys(body).sort(),['aspect_ratio','duration','generate_audio','image_urls','prompt','resolution']);
 assert.equal(body.aspect_ratio,'3:4');assert.equal(body.resolution,'1080p');assert.equal(body.image_urls.length,10);
 const split=makeReferencePlan({duration_seconds:30,output_format:'9:16',template_prompt_snapshot:snapshot},Array.from({length:12},(_,i)=>({path:`p${i}`})));
 assert.equal(split.length,2);assert.equal(split.reduce((n,s)=>n+s.duration,0),30);assert.ok(split.every(s=>s.referencePaths.length<=10));
 assert.throws(()=>makeReferencePlan({duration_seconds:30,output_format:'9:16',template_prompt_snapshot:{...snapshot,kling_resolution:'4k'}},[{path:'a'}]),/supports 480p, 720p, 1080p/);
 assert.equal(makeReferencePlan({duration_seconds:15,output_format:'16:9',template_prompt_snapshot:{...snapshot,video_model:'wan-3.0'}},[{path:'a'}])[0].model,'alibaba/wan-3.0/reference-to-video');
});
test('API films always request native audio, even when the template opted out',()=>{
 for(const video_model of ['wan-3.0-prime',undefined]){
  const snapshot={workflow:'prompt_property_film',user_prompt:'Calm tour',video_model,kling_resolution:'1080p',supports_generate_audio:false,generate_audio:false};
  for(const shot of makeReferencePlan({duration_seconds:18,output_format:'9:16',template_prompt_snapshot:snapshot},Array.from({length:8},(_,i)=>({path:`p${i}`})))){
   assert.equal(shot.generateAudio,true);assert.doesNotMatch(shot.prompt,/Silent film/);
   const body=referenceInput(shot,shot.referencePaths);
   if(video_model)assert.equal(body.generate_audio,true);else assert.equal(body.sound,'on');
  }
 }
});

test('template presenter is the first reference of the opening chapter only', async () => {
  const { templateDirections } = await import('../lib/video-prompts/template-directions.mjs');
  const recipe = templateDirections['grand-entrance'];
  const config = { provider: 'higgsfield_api', generation_mode: 'reference', reference_planner_version: 2, creative_recipe: recipe, director_prompt: Object.values(recipe).join('\n\n'), higgsfield_resolution: '1080p', presenter: { r2_key: 'templates/grand-entrance/presenter-v1.jpg', description: 'a man in a charcoal suit jacket' } };
  for (const n of [6, 7, 10]) {
    const photos = Array.from({ length: n }, (_, i) => ({ path: `p${i}.jpg`, roomType: `view ${i}` }));
    const plan = makeReferencePlan({ duration_seconds: 24, output_format: '9:16', template_prompt_snapshot: config }, photos, { presenterPath: 'presenter.jpg' });
    assert.equal(plan[0].referencePaths[0], 'presenter.jpg');
    assert.ok(plan.every((s) => s.referencePaths.length <= 7));
    assert.ok(plan.slice(1).every((s) => !s.referencePaths.includes('presenter.jpg')));
    assert.equal(plan.flatMap((s) => s.referencePaths).filter((p) => p !== 'presenter.jpg').length, n);
    assert.match(plan[0].prompt, /Reference 1 is the template presenter/);
    assert.match(plan[0].prompt, /only person in the film/);
    assert.doesNotMatch(plan.at(-1).prompt, /PRESENTER/);
    assert.equal(plan.reduce((t, s) => t + s.duration, 0), 24);
  }
  assert.throws(() => makeReferencePlan({ duration_seconds: 24, output_format: '9:16', template_prompt_snapshot: config }, [{ path: 'a.jpg' }]), /presenter reference/);
});
