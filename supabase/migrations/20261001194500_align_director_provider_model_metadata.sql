do $$
declare definition text := pg_get_functiondef('public.queue_prompt_video_project(bigint,bigint,text,text,integer,integer,uuid)'::regprocedure);
begin
  if position('''higgsfield_model'', ''seedance_2_5''' in definition)=0 then
    raise exception 'Director model metadata changed; inspect before migration';
  end if;
  definition := replace(definition, '''higgsfield_model'', ''seedance_2_5''', '''higgsfield_model'', coalesce(recipe.generation_config->>''video_model'', ''seedance_2_5'')');
  execute definition;
end $$;
