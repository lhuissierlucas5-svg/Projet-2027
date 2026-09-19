begin;
create function public.touch_content_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at = clock_timestamp(); return new; end $$;
revoke all on function public.touch_content_updated_at() from public;
do $$ declare t text; begin
 foreach t in array array['candidates','candidate_positions','political_agenda','contender_watch','candidate_issue_cards','campaign_updates'] loop
 execute format('create trigger content_updated_at before update on public.%I for each row execute function public.touch_content_updated_at()',t);
 end loop;
end $$;
commit;
