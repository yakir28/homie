import {createClient} from '@supabase/supabase-js';
import {templateDirections} from '../lib/video-prompts/template-directions.mjs';
const db=createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data,error}=await db.from('video_templates').select('id,slug,generation_config').eq('is_active',true);
if(error)throw error;
for(const t of data){
 if(t.generation_config.workflow==='prompt_property_film')continue; // Director remains unchanged.
 const recipe=templateDirections[t.slug];
 if(!recipe)throw new Error(`No reviewed direction for ${t.slug}`);
}
for(const t of data){
 const recipe=templateDirections[t.slug];if(!recipe)continue;
 const config={...t.generation_config,creative_recipe:recipe,reference_planner_version:2,prompt_recipe_version:'adaptive-effects-v2',director_prompt:Object.values(recipe).join('\n\n'),base_prompt:'A cinematic film of the supplied property with the selected template effect.'};
 // Remove competing demo-specific instructions from NEW project snapshots.
 for(const key of ['shots','timed_prompt','structured_prompt','photo_order','reference_policy','preservation_prompt'])delete config[key];
 const {error}=await db.from('video_templates').update({generation_config:config,updated_at:new Date().toISOString()}).eq('id',t.id);
 if(error)throw error;
 console.log(`Updated ${t.slug}`);
}
