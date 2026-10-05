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

test("template finish: grid reveal on the hook cut and flash on the interior cut keep the film length", async () => {
  const { applyTemplateFinish } = await import("../lib/template-finish.mjs");
  const dir = await mkdtemp(join(tmpdir(), "homie-finish-"));
  try {
    const film = join(dir, "film.mp4");
    // red 0–1 s (hook), blue 1–3 s (facade), green 3–6 s (first room)
    await exec("ffmpeg", ["-v","error","-y","-f","lavfi","-i","color=c=red:s=180x320:r=30:d=1","-f","lavfi","-i","color=c=blue:s=180x320:r=30:d=2","-f","lavfi","-i","color=c=green:s=180x320:r=30:d=3","-filter_complex","[0:v][1:v][2:v]concat=n=3:v=1[v]","-map","[v]","-c:v","libx264","-pix_fmt","yuv420p",film]);
    const result = await applyTemplateFinish(film, { grid_reveal: true, flash_cut: true });
    assert.ok(Math.abs(result.gridAt - 1) < 0.05 && Math.abs(result.flashAt - 3) < 0.05);
    assert.ok(Math.abs(Number((await probeVideo(film)).format.duration) - 6) < 0.1);
    const pixel = async (t, x, y) => [...(await exec("ffmpeg",["-v","error","-ss",String(t),"-i",film,"-frames:v","1","-vf",`crop=4:4:${x}:${y},scale=1:1`,"-f","rawvideo","-pix_fmt","rgb24","pipe:1"],{encoding:"buffer"})).stdout];
    const [r1, , b1] = await pixel(1.05, 88, 158); // centre tile lands first
    const [r2, , b2] = await pixel(1.05, 10, 10);   // corner still holds the hook frame
    assert.ok(b1 > r1 && r2 > b2);
    assert.ok((await pixel(3.0, 88, 158)).every((c) => c > 180)); // white flash
    assert.equal(await applyTemplateFinish(film, undefined), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
