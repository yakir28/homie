import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { makeShotPlan, validateShotPlan, buildGenerationCommand } from "../lib/video-shot-plan.mjs";
import { assembleVideo, probeVideo } from "../lib/video-assembly.mjs";
const exec = promisify(execFile);
const templates = JSON.parse(await readFile(new URL("./fixtures/active-video-templates.json", import.meta.url)));
const photoList = (count) => Array.from({length:count},(_,i)=>({path:`/photo-${i}.jpg`,roomType:`Room ${i}`}));
const projectFor = (t) => ({duration_seconds:t.duration_seconds, output_format:t.format, template_prompt_snapshot:{...t.generation_config, ...(t.generation_config.workflow === "prompt_property_film" ? {user_prompt:"Warm sunset tour",prompt_skill_version:"real-estate-ai-video-v1"} : {})}});
for (const t of templates) {
  test(`${t.name}: its own prompt, references, model and complete timeline`, () => {
    for (const count of [t.min_photos,t.max_photos]) {
      const project=projectFor(t), photos=photoList(count), shots=makeShotPlan(project,photos);
      validateShotPlan(shots,project.output_format);
      assert.ok(Math.abs(shots.reduce((n,s)=>n+(s.editDuration??s.duration),0)-t.duration_seconds)<0.001);
      for (const [i,s] of shots.entries()) {
        const config=t.generation_config;
        const ownPrompt=config.shots?.[i]?.prompt??config.director_prompt??config.structured_prompt??config.timed_prompt??"Warm sunset tour";
        assert.ok(s.prompt.includes(ownPrompt));
        assert.equal(s.model,config.higgsfield_model);
        const args=buildGenerationCommand(s,project.output_format);
        assert.equal(args[args.indexOf("--prompt")+1],s.prompt);
        if(config.supports_generate_audio===false || config.generate_audio===false) {
          assert.equal(args[args.indexOf("--generate_audio")+1],"false");
        }
        if(config.shots?.[i]?.end_photo_index!==undefined) assert.equal(s.endPath,photos[Math.min(photos.length-1,config.shots[i].end_photo_index)].path);
      }
      if(shots.length===1) assert.deepEqual(shots[0].referencePaths,photos.map(p=>p.path));
    }
  });
}

test("gallery templates have unique creative direction",()=>{
  const prompts=templates.filter(t=>t.generation_config.workflow!=="prompt_property_film").map(t=>JSON.stringify(t.generation_config.shots??t.generation_config.director_prompt??t.generation_config.timed_prompt));
  assert.equal(new Set(prompts).size,prompts.length);
});
test("reject broken recipes instead of silently generating a generic film",()=>{
  const t=templates[0], project=projectFor(t);
  assert.throws(()=>makeShotPlan({...project,template_prompt_snapshot:{}},photoList(8)),/missing its shot/);
  assert.doesNotThrow(()=>validateShotPlan(makeShotPlan(project,photoList(1)),project.output_format));
  assert.throws(()=>makeShotPlan({...project,template_prompt_snapshot:{...t.generation_config,shots:[{duration:5}]}},photoList(8)),/own prompt/);
  const p=projectFor(templates.find(t=>t.slug==="blueprint-to-reality"));
  const shots=makeShotPlan(p,photoList(4));
  assert.throws(()=>validateShotPlan([{...shots[0],resolution:"4k"}],p.output_format),/does not support/);
});
test("assembly preserves the closing scene and exact output format with mixed audio and source sizes",{timeout:60000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),"homie-assembly-test-"));
  try {
    const clips=[];
    for(const [i,color] of ["red","green","blue"].entries()) {
      const path=join(dir,`${i}.mp4`);clips.push(path);
      await exec("ffmpeg",["-v","error","-y","-f","lavfi","-i",`color=c=${color}:s=${i===1?"240x320":"320x240"}:r=24:d=1`,...(i===1?["-f","lavfi","-i","sine=frequency=440:duration=1","-c:a","aac"]:[]),"-c:v","libx264","-pix_fmt","yuv420p",path]);
    }
    const output=join(dir,"final.mp4");
    await assembleVideo(clips,clips.map(()=>({duration:1,editDuration:0.5,generateAudio:true})),output,{duration:1.5,aspectRatio:"16:9",resolution:"480p"});
    const meta=await probeVideo(output);
    assert.ok(Math.abs(Number(meta.format.duration)-1.5)<0.2);
    assert.equal(meta.streams.find(s=>s.codec_type==="video").height,480);
    const {stdout}=await exec("ffmpeg",["-v","error","-ss","1.3","-i",output,"-frames:v","1","-vf","crop=10:10,scale=1:1","-f","rawvideo","-pix_fmt","rgb24","pipe:1"],{encoding:"buffer"});
    assert.ok(stdout[2]>180 && stdout[0]<50,"closing blue shot must remain in the final edit");
    await assert.rejects(()=>assembleVideo([clips[0]],[{duration:5}],join(dir,"bad.mp4"),{duration:5,aspectRatio:"16:9",resolution:"480p"}),/shorter/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test("soundtrack choice follows template mood and stays stable per project",async()=>{
  const {pickMusicTrack,musicMoodFor,loadMusicLibrary}=await import("../lib/music.mjs");
  await loadMusicLibrary();
  const tracks=[{id:"a",file:"a.mp3",moods:["warm"],license:"x",duration:60},{id:"b",file:"b.mp3",moods:["energetic"],license:"x",duration:60},{id:"c",file:"c.mp3",moods:["energetic"],license:"x",duration:10}];
  const project={id:7,duration_seconds:30,video_templates:{slug:"pulse-tour"},template_prompt_snapshot:{}};
  assert.equal(musicMoodFor(project),"energetic");
  assert.equal(pickMusicTrack(project,tracks).id,"b","must prefer a matching track long enough for the film");
  assert.equal(pickMusicTrack({...project,template_prompt_snapshot:{music_track:"c"}},tracks).id,"c");
  assert.equal(pickMusicTrack({...project,template_prompt_snapshot:{music:false}},tracks),null);
  assert.equal(pickMusicTrack(project,[]),null);
});
test("assembly mixes a soundtrack under the edit at the exact duration",{timeout:60000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),"homie-music-test-"));
  try {
    const clip=join(dir,"clip.mp4"), song=join(dir,"song.m4a"), output=join(dir,"final.mp4");
    await exec("ffmpeg",["-v","error","-y","-f","lavfi","-i","color=c=gray:s=320x240:r=24:d=2","-c:v","libx264","-pix_fmt","yuv420p",clip]);
    await exec("ffmpeg",["-v","error","-y","-f","lavfi","-i","sine=frequency=330:duration=1","-c:a","aac",song]);
    await assembleVideo([clip],[{duration:2}],output,{duration:2,aspectRatio:"16:9",resolution:"480p",music:{path:song,start:0}});
    const meta=await probeVideo(output);
    assert.ok(Math.abs(Number(meta.format.duration)-2)<0.2);
    assert.ok(meta.streams.some(s=>s.codec_type==="audio"));
    const {stderr}=await exec("ffmpeg",["-v","info","-ss","1.2","-t","0.3","-i",output,"-af","volumedetect","-f","null","-"]);
    assert.ok(Number(/mean_volume: (-?[\d.]+)/.exec(stderr)[1])>-40,"a short track must loop instead of leaving silence");
  } finally {await rm(dir,{recursive:true,force:true});}
});
test("photo casting gives each template a photo that supports its opening hook",async()=>{
  const {castPhotos,photoLabel,PHOTO_ANALYSIS_VERSION}=await import("../lib/photo-analysis.mjs");
  const a=(o)=>({version:PHOTO_ANALYSIS_VERSION,view:"interior",room:"other",label:"x",front_door_visible:false,glass_prominent:false,ground_surface_visible:false,foreground_element:false,straight_on_facade:false,quality:"good",...o});
  const photos=[
    {path:"bath",analysis:a({room:"bathroom"})},
    {path:"garden",analysis:a({view:"exterior_rear",room:"backyard",ground_surface_visible:true})},
    {path:"kitchen",analysis:a({room:"kitchen",glass_prominent:true})},
    {path:"front",analysis:a({view:"exterior_front",room:"none",front_door_visible:true,straight_on_facade:true})},
    {path:"living",analysis:a({room:"living"})},
    {path:"blurry-front",analysis:a({view:"exterior_front",room:"none",front_door_visible:true,quality:"low"})},
  ];
  const order=(slug)=>castPhotos(photos,slug).map(p=>p.path);
  assert.deepEqual(order("warm-threshold"),["front","blurry-front","living","kitchen","bath","garden"]);
  assert.equal(order("house-behind-the-glass")[0],"kitchen");
  assert.equal(castPhotos(photos,"pulse-tour").length,photos.length);
  const plain=[{path:"a"},{path:"b"}];
  assert.equal(castPhotos(plain,"warm-threshold"),plain,"without analysis the saved order is kept");
  assert.equal(photoLabel("Lobby",null),"Lobby");
  assert.equal(photoLabel(null,a({view:"exterior_front",label:"Brick facade",front_door_visible:true})),"Brick facade; front door visible");
});
test("director plans are validated and rendered in the director's own order",async()=>{
  const {validateDirectorPlan,validateMusicChoice}=await import("../lib/director.mjs");
  assert.deepEqual(validateMusicChoice({use_music:false,mood:"calm",reason:"silent template"}),{use_music:false,mood:"calm",reason:"silent template"});
  assert.throws(()=>validateMusicChoice({use_music:true,mood:"jazz",reason:""}),/invalid music/);
  const {makeKlingShotPlan}=await import("../lib/kling-shot-plan.mjs");
  const plan={shots:[
    {role:"door hook",start_photo:4,end_photo:0,duration:6,prompt:"Slow push toward the black front door between two brass lanterns, the door swings open on its hinge."},
    {role:"living",start_photo:2,end_photo:0,duration:6,prompt:"Gentle lateral slide across the cream sofa toward the tall window and oak floor, settling on the fireplace."},
    {role:"garden close",start_photo:6,end_photo:5,duration:6,prompt:"Ease out through the open glass slider onto the stone patio and settle on the lawn with the pergola."},
  ],skipped_photos:[{photo:1,reason:"blurry"}],notes:"x"};
  const shots=validateDirectorPlan(plan,{photoCount:6,duration:18});
  assert.deepEqual(shots.map(s=>[s.start_photo_index,s.end_photo_index]),[[3,undefined],[1,undefined],[5,4]]);
  const photos=Array.from({length:6},(_,i)=>({path:`/p${i}.jpg`}));
  const project={duration_seconds:18,output_format:"9:16",template_prompt_snapshot:{provider:"higgsfield",base_prompt:"Warm tour.",shots,director_plan_applied:true}};
  const planned=makeKlingShotPlan(project,photos);
  assert.deepEqual(planned.map(s=>s.startPath),["/p3.jpg","/p1.jpg","/p5.jpg"],"skipped photos stay out and the order is kept");
  assert.ok(planned[0].prompt.includes("black front door"));
  assert.equal(planned.reduce((n,s)=>n+s.duration,0),18,"generated seconds never exceed the film length");
  assert.throws(()=>validateDirectorPlan({...plan,shots:plan.shots.map(s=>({...s,duration:8}))},{photoCount:6,duration:18}),/add up/);
  assert.throws(()=>validateDirectorPlan({...plan,shots:[{...plan.shots[0],start_photo:9,duration:18}]},{photoCount:6,duration:18}),/does not exist|out of range/);
  assert.throws(()=>validateDirectorPlan({...plan,shots:Array(5).fill({...plan.shots[0],duration:4})},{photoCount:6,duration:18}),/too many/);
});
