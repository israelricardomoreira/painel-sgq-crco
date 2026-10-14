-- ============================================================================
-- Painel SGQ · CRCO — VERSÃO ANTERIOR DE CADA REGISTRO (0.14.0)
-- Rode este arquivo inteiro UMA vez no Supabase: menu SQL Editor > New query >
-- colar > Run. Pode rodar de novo sem perder nada (é idempotente).
--
-- O que faz: toda vez que um registro do painel é alterado ou arquivado, o banco
-- guarda como ele era antes. Quando um registro novo é criado, guarda uma marca
-- de "não existia". Ficam as 5 versões mais recentes de cada registro.
-- Com isso o painel consegue desfazer uma importação (Importar dados > Histórico
-- de gravações) sem restaurar o backup inteiro.
-- Ninguém grava nem apaga esta tabela pelo site: só o próprio banco.
-- ============================================================================

create table if not exists public.docs_versoes (
  id              bigserial primary key,
  colecao         text not null,
  doc_id          text not null,
  acao            text not null check (acao in ('criou','alterou','arquivou')),
  dados           jsonb,              -- como o registro era ANTES (vazio quando ele foi criado)
  arquivado       boolean,            -- se ele estava arquivado antes
  era_de          timestamptz,        -- quando aquela versão tinha sido gravada
  substituida_em  timestamptz not null default now(),
  usuario         uuid,
  email           text,
  bytes           integer
);
create index if not exists docs_versoes_doc on public.docs_versoes (colecao, doc_id, id desc);
create index if not exists docs_versoes_em  on public.docs_versoes (substituida_em desc);

create or replace function public.docs_versionar() returns trigger
language plpgsql security definer set search_path = public as $$
declare manter constant integer := 5;
begin
  if tg_op = 'INSERT' then
    insert into public.docs_versoes(colecao, doc_id, acao, dados, arquivado, era_de, usuario, email, bytes)
    values (new.colecao, new.id, 'criou', null, null, null, auth.uid(), auth.jwt() ->> 'email', 0);
  else
    -- reimportar o mesmo arquivo não muda nada: não guarda versão repetida
    if old.dados is not distinct from new.dados and old.arquivado is not distinct from new.arquivado then
      return new;
    end if;
    insert into public.docs_versoes(colecao, doc_id, acao, dados, arquivado, era_de, usuario, email, bytes)
    values (old.colecao, old.id,
            case when new.arquivado and not old.arquivado then 'arquivou' else 'alterou' end,
            old.dados, old.arquivado, old.atualizado_em, auth.uid(), auth.jwt() ->> 'email',
            octet_length(old.dados::text));
  end if;
  delete from public.docs_versoes v
   where v.colecao = new.colecao and v.doc_id = new.id
     and v.id not in (select id from public.docs_versoes
                       where colecao = new.colecao and doc_id = new.id
                       order by id desc limit manter);
  return new;
end $$;

drop trigger if exists trg_docs_versionar on public.docs;
create trigger trg_docs_versionar after insert or update on public.docs
  for each row execute function public.docs_versionar();

-- TRAVAS: só o administrador (com o código do autenticador) consegue LER as versões
alter table public.docs_versoes enable row level security;
revoke all on public.docs_versoes from anon;
revoke all on public.docs_versoes from authenticated;
grant select on public.docs_versoes to authenticated;
revoke all on sequence public.docs_versoes_id_seq from anon, authenticated;

drop policy if exists versoes_admin_ve on public.docs_versoes;
create policy versoes_admin_ve on public.docs_versoes
  for select to authenticated
  using (public.mfa_ok() and public.meu_papel() = 'admin');

-- ============================================================================
-- Para conferir se funcionou:  select colecao, doc_id, acao, substituida_em, email
--                              from public.docs_versoes order by id desc limit 20;
-- (aparece vazio até a primeira gravação depois de rodar este arquivo)
-- ============================================================================
