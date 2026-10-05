-- ============================================================================
-- Painel SGQ · CRCO — estrutura do banco e TRAVAS DE SEGURANÇA
-- Rode este arquivo inteiro UMA vez no Supabase: menu SQL Editor > New query >
-- colar > Run. Pode rodar de novo sem perder dados (é idempotente).
-- ============================================================================

-- 1) PERFIS: quem pode entrar e com que papel ('admin' grava; 'leitor' só vê)
create table if not exists public.perfis (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  nome      text,
  papel     text not null check (papel in ('admin','leitor')),
  criado_em timestamptz not null default now()
);

-- 2) DOCS: todos os dados do painel (um registro por mês/coleção)
create table if not exists public.docs (
  colecao        text not null,
  id             text not null,
  dados          jsonb not null,
  arquivado      boolean not null default false,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid,
  primary key (colecao, id)
);

-- 3) AUDITORIA: registro de toda gravação (ninguém edita nem apaga pelo site)
create table if not exists public.auditoria (
  id       bigserial primary key,
  em       timestamptz not null default now(),
  usuario  uuid,
  email    text,
  acao     text not null,
  colecao  text,
  doc_id   text,
  bytes    integer
);

-- Funções auxiliares (rodam com privilégio controlado, só leem o próprio perfil)
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where user_id = auth.uid()
$$;

-- Exige verificação em duas etapas (código do autenticador) na sessão
create or replace function public.mfa_ok() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
$$;

-- Carimbo de quem/quando em toda gravação + linha de auditoria
create or replace function public.docs_carimbo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  insert into public.auditoria(usuario, email, acao, colecao, doc_id, bytes)
  values (auth.uid(), auth.jwt() ->> 'email',
          case when tg_op = 'INSERT' then 'criou'
               when new.arquivado and not old.arquivado then 'arquivou'
               else 'alterou' end,
          new.colecao, new.id, octet_length(new.dados::text));
  return new;
end $$;

drop trigger if exists trg_docs_carimbo on public.docs;
create trigger trg_docs_carimbo before insert or update on public.docs
  for each row execute function public.docs_carimbo();

-- ============================================================================
-- TRAVAS (Row Level Security): tudo NEGADO por padrão; só libera o que está abaixo
-- ============================================================================
alter table public.perfis    enable row level security;
alter table public.docs      enable row level security;
alter table public.auditoria enable row level security;

-- Visitante sem login não tem acesso a nada
revoke all on public.perfis, public.docs, public.auditoria from anon;
revoke all on sequence public.auditoria_id_seq from anon;

-- Usuário logado: só o necessário (sem DELETE em lugar nenhum)
revoke all on public.perfis, public.docs, public.auditoria from authenticated;
grant select on public.perfis to authenticated;
grant select, insert, update on public.docs to authenticated;
grant select on public.auditoria to authenticated;

drop policy if exists perfis_ver_o_proprio on public.perfis;
create policy perfis_ver_o_proprio on public.perfis
  for select to authenticated using (user_id = auth.uid());

drop policy if exists docs_ler on public.docs;
create policy docs_ler on public.docs
  for select to authenticated
  using (public.mfa_ok() and public.meu_papel() in ('admin','leitor'));

drop policy if exists docs_criar on public.docs;
create policy docs_criar on public.docs
  for insert to authenticated
  with check (public.mfa_ok() and public.meu_papel() = 'admin');

drop policy if exists docs_alterar on public.docs;
create policy docs_alterar on public.docs
  for update to authenticated
  using (public.mfa_ok() and public.meu_papel() = 'admin')
  with check (public.mfa_ok() and public.meu_papel() = 'admin');

drop policy if exists auditoria_admin_ve on public.auditoria;
create policy auditoria_admin_ve on public.auditoria
  for select to authenticated
  using (public.mfa_ok() and public.meu_papel() = 'admin');

-- ============================================================================
-- DEPOIS de criar seu usuário em Authentication > Users, rode (trocando o e-mail):
--
--   insert into public.perfis(user_id, nome, papel)
--   select id, 'Israel', 'admin' from auth.users where email = 'SEU-EMAIL@AQUI'
--   on conflict (user_id) do update set papel = excluded.papel, nome = excluded.nome;
--
-- Para dar acesso só de leitura a outra pessoa, mesmo comando com 'leitor'.
-- Para tirar o acesso:  delete from public.perfis where user_id = (select id from auth.users where email='...');
-- Para ver o histórico: select * from public.auditoria order by em desc limit 100;
-- ============================================================================
