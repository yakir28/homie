// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
// Uses an in-memory database only; never connects to Supabase.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
 const core = await fs.readFile(new URL('../supabase/migrations/20260807144650_homie_core_schema.sql',import.meta.url),'utf8');
 await db.exec('create role anon; create role authenticated; create role service_role; create table public.workspaces(id bigint primary key); create table public.video_projects(id bigint primary key); create table public.profiles(id uuid primary key);');
 for(const name of ['plans','subscriptions','credit_wallets','credit_ledger'])await db.exec(core.match(new RegExp(`create table public.${name} \\([\\s\\S]*?\\n\\);`))[0].replace("('stripe', 'manual')","('polar', 'stripe', 'manual')"));
 await db.exec("create table public.payment_webhook_events(id text primary key,provider text,event_type text,created_at timestamptz default now());");
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261008091424_fix_polar_allowance_event_order.sql',import.meta.url),'utf8'));
 await db.exec("insert into workspaces values (1),(2); insert into credit_wallets(workspace_id) values (1),(2); insert into plans(name,slug,audience,monthly_credits) values ('Starter','starter','solo',150);");
 async function deliver(id,{status='active',start='2026-10-01',end='2026-11-01',at='2026-10-01',grant=true,workspace=1,interval='monthly'}={}) {
  await db.query('select sync_polar_subscription($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[id,'subscription.updated',workspace,'starter','customer','sub-'+workspace,status,interval,start,end,false,grant,at]);
 }
 const balance=async()=>Number((await db.query('select balance from credit_wallets where workspace_id=1')).rows[0].balance);
 await deliver('initial');assert.equal(await balance(),150);
 await db.exec('update credit_wallets set balance=90 where workspace_id=1');
 await deliver('initial');await deliver('same-period',{at:'2026-10-02'});assert.equal(await balance(),90);
 await deliver('renewal',{start:'2026-11-01',end:'2026-12-01',at:'2026-11-01'});assert.equal(await balance(),150);
 await deliver('stale-revocation',{status:'expired',grant:false,at:'2026-10-03'});assert.equal(await balance(),150);
 await deliver('revoked',{status:'expired',grant:false,start:'2026-11-01',end:'2026-12-01',at:'2026-11-02'});assert.equal(await balance(),0);
 await deliver('stale-active',{start:'2026-11-01',end:'2026-12-01',at:'2026-11-01T12:00:00Z'});assert.equal(await balance(),0);
 await deliver('annual',{workspace:2,interval:'yearly',end:'2027-10-01'});
 assert.equal((await db.query('select balance from credit_wallets where workspace_id=2')).rows[0].balance,1800);
 await assert.rejects(()=>deliver('missing-wallet',{workspace:3}));
 assert.equal((await db.query("select count(*)::int n from payment_webhook_events where id='missing-wallet'")).rows[0].n,0);
 await db.exec(`create function public.queue_video_project(target_workspace_id bigint,a bigint,b bigint,c text,d bigint[],e text,f text) returns void language plpgsql as $$ declare current_plan_slug text := 'free-trial'; computed_credit_cost integer := 30; begin
  if current_plan_slug = 'free-trial' then null; end if;
 end $$;`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261010003232_add_polar_credit_purchases.sql',import.meta.url),'utf8'));
 async function purchase(id,{refund=0,paid=true,workspace=1}={}) {
  await db.query('select fulfill_polar_credit_order($1,$2,$3,$4,$5,$6,$7)',[id,workspace,'pack60',60,2200,refund,paid]);
 }
 const wallet=async()=> (await db.query('select balance,purchased_balance,purchase_refund_debt from credit_wallets where workspace_id=1')).rows[0];
 await purchase('purchase1');await purchase('purchase1');assert.equal(await balance(),60);
 await db.exec('update credit_wallets set balance=balance-20,lifetime_spent=lifetime_spent+20 where workspace_id=1');
 assert.equal((await wallet()).purchased_balance,40);
 await deliver('next-renewal',{start:'2026-12-01',end:'2027-01-01',at:'2026-12-01'});
 assert.equal(await balance(),190);assert.equal((await wallet()).purchased_balance,40);
 await db.exec('update credit_wallets set balance=balance-30,lifetime_spent=lifetime_spent+30 where workspace_id=1');
 assert.equal((await wallet()).purchased_balance,40);
 await deliver('next-expiry',{status:'expired',grant:false,start:'2026-12-01',end:'2027-01-01',at:'2026-12-02'});
 assert.equal(await balance(),40);
 await purchase('purchase1',{refund:2200,paid:false});await purchase('purchase1',{refund:2200,paid:false});
 assert.deepEqual(await wallet(),{balance:0,purchased_balance:0,purchase_refund_debt:20});
 await purchase('purchase2');assert.deepEqual(await wallet(),{balance:40,purchased_balance:40,purchase_refund_debt:0});
 await purchase('reordered',{refund:1100,paid:false});assert.equal(await balance(),40);
 await purchase('reordered');assert.equal(await balance(),70);
 await purchase('reordered');assert.equal(await balance(),70);
 await assert.rejects(()=>db.query('select fulfill_polar_credit_order($1,$2,$3,$4,$5,$6,$7)',['purchase2',2,'pack60',60,2200,0,true]));
 await db.exec(`create schema auth; create table auth.users(id uuid primary key);
 create table public.workspace_members(workspace_id bigint,user_id uuid);
 insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
 insert into workspace_members values (1,'00000000-0000-0000-0000-000000000001'),(2,'00000000-0000-0000-0000-000000000001'),(2,'00000000-0000-0000-0000-000000000002');
 create function public.bootstrap_workspace(workspace_name text) returns integer language plpgsql as $$ declare trial_was_granted boolean:=true; begin return case when coalesce(trial_was_granted,false) then 30 else 0 end; end $$;`);
 await db.exec(`insert into workspaces values (3),(4);
 insert into plans(name,slug,audience,monthly_credits) values ('Free trial','free-trial','solo',30);
 insert into subscriptions(workspace_id,plan_id) select w.id,p.id from workspaces w cross join plans p where w.id in (3,4) and p.slug='free-trial';
 insert into credit_wallets(workspace_id,balance,lifetime_credited,purchased_balance) values (3,30,30,0),(4,90,90,60);
 insert into credit_ledger(workspace_id,amount,entry_type,description,idempotency_key) values (3,30,'trial','old gift','gift3'),(4,30,'trial','old gift','gift4'),(4,60,'top_up','bought','bought4');`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261010011214_paid_first_video.sql',import.meta.url),'utf8'));
 assert.deepEqual((await db.query('select balance,purchased_balance from credit_wallets where workspace_id in (3,4) order by workspace_id')).rows,[{balance:0,purchased_balance:0},{balance:60,purchased_balance:60}]);
 assert.equal((await db.query("select bootstrap_workspace('test') as balance")).rows[0].balance,0);
 const uid='00000000-0000-0000-0000-000000000001';const nonce='00000000-0000-0000-0000-000000000011';
 const reserve=async(workspace=1,n=nonce)=>db.query('select * from reserve_first_video($1,$2,$3)',[uid,workspace,n]);
 await reserve();assert.equal((await reserve(1,'00000000-0000-0000-0000-000000000012')).rows[0].reservation_id,nonce);
 await assert.rejects(()=>reserve(2));
 await db.query('update polar_first_video_purchases set checkout_id=$1 where user_id=$2',['intro-checkout',uid]);
 const before=await balance();
 await db.query('select fulfill_polar_first_video($1,1,$2,$3,0,true)',['intro-order','intro-product','intro-checkout']);
 await db.query('select fulfill_polar_first_video($1,1,$2,$3,0,true)',['intro-order','intro-product','intro-checkout']);
 assert.equal(await balance(),before+30);
 await assert.rejects(()=>reserve());
 await assert.rejects(()=>db.query('select fulfill_polar_first_video($1,1,$2,$3,0,true)',['second-intro-order','intro-product','intro-checkout']));
 await db.exec('alter table video_projects add column workspace_id bigint, add column created_by uuid, add column created_at timestamptz default now(), add column status text;');
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261010011512_post_intro_video_pack.sql',import.meta.url),'utf8'));
 const offer=async()=> (await db.query('select first_video_offer_state($1,1) as state',[uid])).rows[0].state;
 assert.deepEqual(await offer(),{purchased:true,eligible:false});
 await db.query("insert into video_projects(id,workspace_id,created_by,created_at,status) values(1,1,$1,now()+interval '1 second','failed')",[uid]);
 assert.equal((await offer()).eligible,false);
 await db.exec("update video_projects set status='awaiting_approval' where id=1");
 assert.equal((await offer()).eligible,true);
 const beforePack=await balance();
 await db.query('select fulfill_polar_credit_order($1,1,$2,90,2000,0,true)',['followup-pack','product90']);
 await db.query('select fulfill_polar_credit_order($1,1,$2,90,2000,0,true)',['followup-pack','product90']);
 assert.equal(await balance(),beforePack+90);
 assert.equal((await db.query('select first_video_offer_state($1,1) as state',['00000000-0000-0000-0000-000000000002'])).rows[0].state,null);
 console.log('PASS: follow-up pack requires paid intro plus successful creation; 90-credit pack is idempotent; other users cannot inherit offer');
 console.log('PASS: zero signup credits, one reservation per user, cross-workspace restriction, paid intro grants 30 exactly once');
 console.log('PASS: purchase replay, allowance-first spending, renewal/cancellation preserve purchases, partial/full/refund-before-paid, spent-credit refund debt, order reassignment rejected');
 console.log('PASS: initial grant, duplicate delivery, same-period replay, renewal, stale revocation, expiry, stale activation, annual allowance, failed transaction rollback');
} catch(error) { console.error(error.message, error.where || "", error.position, error.internalQuery || ""); process.exitCode=1; } finally { await db.close(); }
