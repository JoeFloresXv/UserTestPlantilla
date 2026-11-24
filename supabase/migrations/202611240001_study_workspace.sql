-- Additive migration for studies synchronized through Supabase.
begin;
alter table public.studies add column if not exists methodology jsonb;
alter table public.study_sections add column if not exists task_settings jsonb;
alter table public.participant_section_notes add column if not exists outcome text check (outcome in ('Sin ayuda','Con ayuda','Incompleta'));
alter table public.participant_section_notes add column if not exists ease smallint check (ease between 1 and 5);
commit;
