begin;

-- Keep the selected recipe's model/mode paired together in the immutable snapshot.
-- Changing only the model breaks Seedance 2.5 omni-reference templates.
do $migration$
declare
  definition text := pg_get_functiondef('public.queue_video_project(bigint,bigint,bigint,text,bigint[],text,text)'::regprocedure);
  old_model text := '''higgsfield_model'', ''seedance_2_0''';
  new_model text := '''higgsfield_model'', coalesce(nullif(selected_template.generation_config->>''higgsfield_model'', ''''), nullif(selected_template.generation_config->>''model'', ''''), ''seedance_2_0'')';
  validation text := $validation$
  if coalesce(selected_template.generation_config->>'higgsfield_model', selected_template.generation_config->>'model') = 'seedance_2_5'
     and target_resolution = '4k' then
    raise exception 'This template supports up to 1080p';
  end if;
  select q.credits_cost$validation$;
begin
  if position(old_model in definition) = 0 then raise exception 'Unexpected queue function: model override not found'; end if;
  if position('select q.credits_cost' in definition) = 0 then raise exception 'Unexpected queue function: pricing step not found'; end if;
  definition := replace(definition, old_model, new_model);
  definition := replace(definition, 'select q.credits_cost', validation);
  execute definition;
end;
$migration$;

commit;
