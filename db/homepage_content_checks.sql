-- Run as postgres. All changes, including the temporary test identity, roll back.
begin;
select set_config('test.home_admin', gen_random_uuid()::text, true);
insert into auth.users (id) values (current_setting('test.home_admin')::uuid);
insert into public.site_admins (user_id) values (current_setting('test.home_admin')::uuid);
select set_config('test.home_version', updated_at::text, true) from public.homepage_content where id='home';
set local role anon;
do $$ begin
 if (select count(*) from public.homepage_content) <> 1 then raise exception 'Public read failed'; end if;
 begin
  update public.homepage_content set title='Forbidden';
  raise exception 'Anonymous update allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare affected integer; begin
 update public.homepage_content set title='Forbidden';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Non-admin update allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object('sub',current_setting('test.home_admin'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare affected integer; begin
 update public.homepage_content set title='Validation transactionnelle' where id='home' and updated_at=current_setting('test.home_version')::timestamptz;
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'Admin update failed'; end if;
 if (select updated_at=current_setting('test.home_version')::timestamptz from public.homepage_content) then raise exception 'Timestamp not advanced'; end if;
 update public.homepage_content set title='Stale write' where id='home' and updated_at=current_setting('test.home_version')::timestamptz;
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Stale update allowed'; end if;
 begin
  update public.homepage_content set title='   ' where id='home';
  raise exception 'Blank title allowed';
 exception when check_violation then null; end;
 begin
  update public.homepage_content set title=repeat('a',121) where id='home';
  raise exception 'Oversized title allowed';
 exception when check_violation then null; end;
 begin
  update public.homepage_content set updated_at=now() where id='home';
  raise exception 'Client timestamp update allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.homepage_content (id) values ('other');
  raise exception 'Admin insert allowed';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.homepage_content where id='home';
  raise exception 'Admin delete allowed';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: public read, anon/non-admin denied, admin update, concurrency, validation, no insert/delete or timestamp writes; all test changes rolled back' as result;
