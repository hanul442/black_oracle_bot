-- NARS v4 matching performance (no scoring or decision changes).
--
-- nars-primary-evidence-match-10m and nars-calibrate-hourly were failing on the
-- 2-minute statement timeout (143 and 24 failures in 24h on 2026-10-02):
--   * primary evidence matching re-tokenized both titles four times per
--     event x artifact pair (~870k pairs);
--   * calibration compared every pair of 7-day events inside a 24h window
--     (~6.7M pairs) with trigram similarity and regex subject parsing.
--
-- Fixes:
--   1. Trigram GIN index on lower(nars_events.title) (applied separately as
--      nars_v4_events_title_trgm_index; repeated here idempotently).
--   2. Calibration finds candidate pairs through the trigram index. The
--      explicit similarity >= 0.20 filter is unchanged, so the candidate set
--      is identical.
--   3. Primary matching tokenizes each title once and derives the shared
--      token count and Jaccard from the token arrays. Title tokens are already
--      distinct, so |a ∩ b| and |a| + |b| - |a ∩ b| equal the values that
--      nars_shared_token_count and nars_token_jaccard return.
--
-- Rollback: re-apply the function bodies from
-- 20260908095234_nars_v4_primary_evidence_matching_series_guard.sql and
-- 20260907111631_nars_v4_calibration_view_security_hardening.sql, then
-- drop index if exists public.nars_events_lower_title_trgm_idx;

create index if not exists nars_events_lower_title_trgm_idx
  on public.nars_events using gin (lower(title) extensions.gin_trgm_ops);

create or replace function public.nars_refresh_calibration_samples(p_limit integer default 100)
returns jsonb
language plpgsql
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_merge integer := 0;
  v_split integer := 0;
  v_pruned integer := 0;
  v_prev_threshold text := current_setting('pg_trgm.similarity_threshold', true);
begin
  delete from public.nars_calibration_samples s
  where s.decision is null and (
    (s.sample_type='merge_story_document' and (
      not exists(select 1 from public.nars_stories st where st.id=s.parent_id)
      or not exists(select 1 from public.nars_documents d where d.id=s.child_id)
    ))
    or (s.sample_type='merge_event_story' and (
      not exists(select 1 from public.nars_events e where e.id=s.parent_id)
      or not exists(select 1 from public.nars_stories st where st.id=s.child_id)
    ))
    or (s.sample_type='split_event_pair' and (
      not exists(select 1 from public.nars_events e where e.id=s.parent_id)
      or not exists(select 1 from public.nars_events e where e.id=s.child_id)
      or (
        public.nars_structured_subject(s.parent_title) is not null
        and public.nars_structured_subject(s.child_title) is not null
        and public.nars_structured_subject(s.parent_title)<>public.nars_structured_subject(s.child_title)
      )
    ))
  );
  get diagnostics v_pruned=row_count;

  insert into public.nars_calibration_samples(sample_key,sample_type,parent_id,child_id,similarity,method,parent_title,child_title,snapshot,updated_at)
  select 'merge:'||r.review_type||':'||r.parent_id::text||':'||r.child_id::text,
    case r.review_type when 'story_document' then 'merge_story_document' else 'merge_event_story' end,
    r.parent_id,r.child_id,r.similarity,r.method,r.parent_title,r.child_title,
    jsonb_build_object('observed_at',r.observed_at,'source','nars_cluster_review_queue_v1'),now()
  from public.nars_cluster_review_queue_v1 r
  where r.review_type in('story_document','event_story')
  order by r.observed_at desc limit greatest(1,p_limit)
  on conflict(sample_key) do update set similarity=excluded.similarity,method=excluded.method,parent_title=excluded.parent_title,
    child_title=excluded.child_title,snapshot=public.nars_calibration_samples.snapshot||excluded.snapshot,updated_at=now();
  get diagnostics v_merge=row_count;

  -- The % operator only narrows the search through the trigram index; the
  -- explicit similarity filter below still decides membership.
  perform set_config('pg_trgm.similarity_threshold','0.19',true);

  with candidate_pairs as (
    select e1.id parent_id,e2.id child_id,e1.title parent_title,e2.title child_title,
      abs(extract(epoch from(e1.first_detected_at-e2.first_detected_at))) delta_seconds,
      public.nars_event_match_score(e1.title,e2.title,abs(extract(epoch from(e1.first_detected_at-e2.first_detected_at))))::numeric candidate_score
    from public.nars_events e1
    join public.nars_events e2 on lower(e2.title) % lower(e1.title)
      and e1.id<e2.id and abs(extract(epoch from(e1.first_detected_at-e2.first_detected_at)))<=86400
    where e1.last_updated_at>=now()-interval '7 days'
      and e2.last_updated_at>=now()-interval '7 days'
      and extensions.similarity(lower(e1.title),lower(e2.title))>=0.20
      and (public.nars_structured_subject(e1.title) is null
        or public.nars_structured_subject(e2.title) is null
        or public.nars_structured_subject(e1.title)=public.nars_structured_subject(e2.title))
  ), ranked as (
    select * from candidate_pairs where candidate_score>=0.40 and candidate_score<0.58
    order by candidate_score desc,delta_seconds asc limit greatest(1,p_limit)
  )
  insert into public.nars_calibration_samples(sample_key,sample_type,parent_id,child_id,similarity,method,parent_title,child_title,snapshot,updated_at)
  select 'split:event:'||parent_id::text||':'||child_id::text,'split_event_pair',parent_id,child_id,candidate_score,
    'lexical_v2_near_threshold',parent_title,child_title,
    jsonb_build_object('delta_seconds',delta_seconds,'threshold',0.58,'source','near_threshold_separate_events','structured_subject_guard','4.8.1'),now()
  from ranked
  on conflict(sample_key) do update set similarity=excluded.similarity,parent_title=excluded.parent_title,child_title=excluded.child_title,
    snapshot=public.nars_calibration_samples.snapshot||excluded.snapshot,updated_at=now();
  get diagnostics v_split=row_count;

  perform set_config('pg_trgm.similarity_threshold',coalesce(v_prev_threshold,'0.3'),true);

  return jsonb_build_object('pruned_stale_or_hard_veto_samples',v_pruned,'merge_candidates_touched',v_merge,'split_candidates_touched',v_split,'refreshed_at',now());
end;
$function$;

create or replace function public.nars_refresh_primary_evidence_matches(p_event_limit integer default 500, p_artifact_days integer default 45)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_claim_sync jsonb; v_candidates integer:=0; v_direct_claims integer:=0; v_auto_claims integer:=0; v_event_links integer:=0; v_rescore jsonb;
begin
  v_claim_sync:=public.nars_sync_event_headline_claims(greatest(2000,coalesce(p_event_limit,500)*3));

  with ev as materialized (
    select e.id,e.title,e.first_detected_at,e.last_updated_at,s.priority_score,s.priority_band,
      public.nars_structured_subject(e.title) as structured_subject,
      public.nars_official_series_version(e.title) as series_version,
      public.nars_title_tokens(e.title) as tokens,
      lower(e.title) as lower_title
    from public.nars_events e
    join public.nars_event_score_latest_v1 s on s.event_id=e.id
    where s.priority_score>=45
    order by s.priority_score desc,e.last_updated_at desc
    limit greatest(1,least(coalesce(p_event_limit,500),5000))
  ), cl as (
    select distinct on (c.event_id) c.id,c.event_id,c.claim_text
    from public.nars_event_claims c join ev on ev.id=c.event_id
    where c.status='active' and c.claim_type='headline_assertion'
    order by c.event_id,c.updated_at desc
  ), art as materialized (
    select a.id,a.title,a.authority_key,a.publisher_key,a.published_at,a.retrieved_at,a.created_at,
      public.nars_structured_subject(a.title) as structured_subject,
      public.nars_official_series_version(a.title) as series_version,
      public.nars_title_tokens(a.title) as tokens,
      lower(a.title) as lower_title
    from public.nars_evidence_artifacts a where a.verification_status='content_verified'
  ), paired as (
    select ev.id as event_id,cl.id as claim_id,art.id as artifact_id,ev.title as event_title,art.title as artifact_title,art.authority_key,art.publisher_key,
      ev.structured_subject as event_subject,art.structured_subject as artifact_subject,ev.series_version as event_series,art.series_version as artifact_series,
      extensions.similarity(ev.lower_title,art.lower_title)::numeric as tri,
      case when ev.tokens operator(pg_catalog.&&) art.tokens
        then cardinality(array(select unnest(ev.tokens) intersect select unnest(art.tokens)))
        else 0 end as shared,
      cardinality(ev.tokens)+cardinality(art.tokens) as token_total,
      least(abs(extract(epoch from(coalesce(art.published_at,art.retrieved_at,art.created_at)-ev.first_detected_at)))/3600.0,
            abs(extract(epoch from(coalesce(art.retrieved_at,art.created_at)-ev.first_detected_at)))/3600.0)::numeric as hours,
      exists(select 1 from public.nars_event_evidence_links x where x.event_id=ev.id and x.artifact_id=art.id) as existing_link,
      case
        when ev.series_version is not null and art.series_version is not null and ev.series_version<>art.series_version then 'CONFLICT'
        when ev.structured_subject is not null and art.structured_subject is not null and ev.structured_subject<>art.structured_subject then 'CONFLICT'
        when art.authority_key='kr:fss-dart' and art.structured_subject is not null and position(art.structured_subject in lower(ev.title))=0 then 'DART_ISSUER_MISSING'
        when ev.series_version is not null and art.series_version is not null and ev.series_version=art.series_version then 'MATCH'
        when art.structured_subject is not null and ((ev.structured_subject is not null and ev.structured_subject=art.structured_subject) or position(art.structured_subject in lower(ev.title))>0) then 'MATCH'
        else 'NONE'
      end as gate
    from ev join cl on cl.event_id=ev.id
    join art on (
      coalesce(art.published_at,art.retrieved_at,art.created_at) between ev.first_detected_at-make_interval(days=>greatest(1,least(coalesce(p_artifact_days,45),90))) and coalesce(ev.last_updated_at,ev.first_detected_at)+make_interval(days=>greatest(1,least(coalesce(p_artifact_days,45),90)))
      or coalesce(art.retrieved_at,art.created_at) between ev.first_detected_at-make_interval(days=>greatest(1,least(coalesce(p_artifact_days,45),90))) and coalesce(ev.last_updated_at,ev.first_detected_at)+make_interval(days=>greatest(1,least(coalesce(p_artifact_days,45),90)))
    )
  ), raw as (
    select paired.*,
      (case when token_total-shared=0 then 0::real else (shared::real/(token_total-shared)::real) end)::numeric as jac
    from paired
  ), f as (
    select raw.*,
      (case when hours<=6 then 1.0 when hours<=24 then .85 when hours<=72 then .60 when hours<=168 then .35 else .10 end)::numeric as temporal,
      least(1.0,0.35*tri+0.25*jac+0.15*(case when hours<=6 then 1.0 when hours<=24 then .85 when hours<=72 then .60 when hours<=168 then .35 else .10 end)+0.15*least(shared/4.0,1.0)+0.10*(case when gate='MATCH' then 1.0 else 0.0 end))::numeric as final_score
    from raw
    where tri>=0.18 or jac>=0.20 or shared>=2 or gate in ('MATCH','CONFLICT','DART_ISSUER_MISSING')
  ), decided as (
    select f.*,
      case
        when gate in ('CONFLICT','DART_ISSUER_MISSING') then 'REJECT'
        when gate='MATCH' and final_score>=0.70 and shared>=3 and (jac>=0.45 or tri>=0.50) and hours<=336 then 'AUTO_LINK'
        when final_score>=0.80 and shared>=4 and jac>=0.50 and tri>=0.45 and hours<=720 then 'AUTO_LINK'
        when final_score>=0.48 and shared>=2 and (jac>=0.25 or tri>=0.30) and hours<=1080 then 'REVIEW'
        else 'REJECT'
      end as decision
    from f
  )
  insert into public.nars_evidence_match_candidates(event_id,claim_id,artifact_id,match_version,algorithmic_decision,review_status,relation_suggestion,lexical_similarity,token_jaccard,shared_tokens,temporal_score,time_distance_hours,subject_gate,final_score,is_existing_link,rationale)
  select event_id,claim_id,artifact_id,'4.10.1-match-v2',decision,case when decision='REVIEW' then 'PENDING' else 'NOT_REQUIRED' end,'supports',round(tri,5),round(jac,5),shared,round(temporal,5),round(hours,3),gate,round(final_score,5),existing_link,
    jsonb_build_object('event_title',event_title,'artifact_title',artifact_title,'authority_key',authority_key,'publisher_key',publisher_key,'event_subject',event_subject,'artifact_subject',artifact_subject,'event_series',event_series,'artifact_series',artifact_series,'precision_policy','auto>=0.80; structured/series>=0.70; review>=0.48')
  from decided
  on conflict(event_id,artifact_id,match_version) do update set claim_id=excluded.claim_id,algorithmic_decision=excluded.algorithmic_decision,
    review_status=case when public.nars_evidence_match_candidates.review_status in ('APPROVED','REJECTED') then public.nars_evidence_match_candidates.review_status else excluded.review_status end,
    relation_suggestion=excluded.relation_suggestion,lexical_similarity=excluded.lexical_similarity,token_jaccard=excluded.token_jaccard,shared_tokens=excluded.shared_tokens,temporal_score=excluded.temporal_score,time_distance_hours=excluded.time_distance_hours,subject_gate=excluded.subject_gate,final_score=excluded.final_score,is_existing_link=excluded.is_existing_link,rationale=excluded.rationale,updated_at=now();
  get diagnostics v_candidates=row_count;

  insert into public.nars_claim_evidence_links(claim_id,artifact_id,relation,confidence,link_method,metadata)
  select c.id,l.artifact_id,l.relation,l.confidence,'direct_event_link_backfill_v1',jsonb_build_object('event_id',l.event_id,'source_link_method',l.link_method,'is_direct',l.is_direct)
  from public.nars_event_evidence_links l join public.nars_evidence_artifacts a on a.id=l.artifact_id and a.verification_status='content_verified'
  join public.nars_event_claims c on c.event_id=l.event_id and c.status='active' and c.claim_type='headline_assertion'
  where l.relation in ('supports','context','mentions') on conflict(claim_id,artifact_id,relation) do nothing;
  get diagnostics v_direct_claims=row_count;

  insert into public.nars_claim_evidence_links(claim_id,artifact_id,relation,confidence,link_method,metadata)
  select m.claim_id,m.artifact_id,'supports',m.final_score,'primary_evidence_match_v2',jsonb_build_object('candidate_id',m.id,'match_version',m.match_version,'subject_gate',m.subject_gate,'shared_tokens',m.shared_tokens,'token_jaccard',m.token_jaccard,'lexical_similarity',m.lexical_similarity,'time_distance_hours',m.time_distance_hours)
  from public.nars_evidence_match_candidates m
  where m.match_version='4.10.1-match-v2' and m.algorithmic_decision='AUTO_LINK' and m.review_status='NOT_REQUIRED' and not m.is_existing_link
  on conflict(claim_id,artifact_id,relation) do nothing;
  get diagnostics v_auto_claims=row_count;

  insert into public.nars_event_evidence_links(event_id,artifact_id,relation,confidence,link_method,is_direct,metadata)
  select m.event_id,m.artifact_id,'supports',m.final_score,'primary_evidence_match_v2',false,jsonb_build_object('candidate_id',m.id,'claim_id',m.claim_id,'match_version',m.match_version,'subject_gate',m.subject_gate,'shared_tokens',m.shared_tokens,'token_jaccard',m.token_jaccard,'lexical_similarity',m.lexical_similarity,'time_distance_hours',m.time_distance_hours)
  from public.nars_evidence_match_candidates m
  where m.match_version='4.10.1-match-v2' and m.algorithmic_decision='AUTO_LINK' and m.review_status='NOT_REQUIRED' and not m.is_existing_link
  on conflict(event_id,artifact_id,relation) do nothing;
  get diagnostics v_event_links=row_count;
  if v_event_links>0 then v_rescore:=public.nars_score_events(500); end if;
  return jsonb_build_object('version','4.10.1-match-v2','claim_sync',v_claim_sync,'candidate_rows',v_candidates,'direct_claim_links_inserted',v_direct_claims,'auto_claim_links_inserted',v_auto_claims,'event_links_inserted',v_event_links,'rescore',v_rescore);
end;$function$;
