# Painel SGQ · CRCO

Painel de indicadores do Sistema de Gestão da Qualidade do Cartório de Registros de Cidade Ocidental (CRCO).
Ele calcula os KPIs a partir dos exports do VHL, do Tri7 e da folha, guarda tudo no Supabase com acesso restrito e gera a memória de cálculo auditável para o IND-SGQ-001 no ANOREG+.

- **Site:** GitHub Pages (este repositório). Aqui fica só código, nenhum dado.
- **Dados:** Supabase (Postgres), com login, verificação em duas etapas e regras de acesso no próprio banco.

---

## Instalação (uma vez só, cerca de 20 minutos)

### 1. Supabase: criar o projeto
1. Entre em <https://supabase.com>, crie a conta e clique em **New project**.
   - **Name:** `painel-sgq-crco`
   - **Database password:** gere uma senha forte e guarde no cofre de senhas. Ela não vai para o site.
   - **Region:** South America (São Paulo)
2. Espere o projeto ficar pronto (1 a 2 minutos).

### 2. Supabase: criar as tabelas e as travas
1. No menu lateral, abra **SQL Editor** e clique em **New query**.
2. Cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Deve aparecer *Success*.

### 3. Supabase: configurar o login
Em **Authentication**:
1. **Sign In / Providers → Email**:
   - **desligue** *Allow new users to sign up*. Ninguém cria conta sozinho.
2. **Multi-Factor**: confira que **TOTP (App Authenticator)** está habilitado. Vem ligado por padrão.
3. **URL Configuration → Site URL**: `https://israelricardomoreira.github.io/painel-sgq-crco/`
4. **Users → Add user → Create new user**: seu e-mail e uma senha forte. Marque *Auto Confirm User*.
5. Volte ao **SQL Editor** e rode o comando abaixo, trocando o e-mail, para virar administrador:
   ```sql
   insert into public.perfis(user_id, nome, papel)
   select id, 'Israel', 'admin' from auth.users where email = 'SEU-EMAIL@AQUI'
   on conflict (user_id) do update set papel = excluded.papel, nome = excluded.nome;
   ```

### 4. Ligar o site ao banco
1. No Supabase, abra **Project Settings → API** (ou **Data API**) e copie:
   - **Project URL**, que tem o formato `https://xxxx.supabase.co`;
   - a chave **anon / public** (ou *publishable*). **Não** use a `service_role` / *secret*.
2. Aqui no GitHub, abra `config.js`, clique no lápis (Edit), cole os dois valores entre as aspas e salve (**Commit changes**).

### 5. Publicar no GitHub Pages
**Settings → Pages → Build and deployment**: *Source* = **Deploy from a branch**, *Branch* = **main**, pasta **/ (root)** → **Save**.
Em 1 ou 2 minutos o site fica em `https://israelricardomoreira.github.io/painel-sgq-crco/`.

### 6. Primeiro acesso
1. Entre com e-mail e senha.
2. Leia o QR code com o Google Authenticator ou o Microsoft Authenticator e digite o código.
3. Em **Importar dados → Restaurar backup**, escolha o arquivo `backup-inicial-painel-sgq.json`. Ele traz todos os dados de junho a outubro/2026. **Esse arquivo não vai para o GitHub.**

---

## Uso no dia a dia

| O que | Onde |
|---|---|
| Lançar um mês novo | Menu **Importar dados**: solte os PAINEL-01 a 05 do VHL, o Relatório de andamentos do Tri7 e o Rel. Eventos da folha, depois **Salvar e atualizar o painel** |
| Ver quem deu entrada, redigiu exigência, revisou e gerou os selos | Menu **Quem fez · Tri7** e a ficha do protocolo |
| Copiar os KPIs para o ANOREG+ | Aba **Lançar KPIs** |
| Mudar meta, nome ou incluir um KPI | **Lançar KPIs → Editar indicadores** |
| Ver só RI, RC, RTD/PJ, Apoio ou tudo junto | Filtro **Serventia** no topo ("Todas" abre o comparativo) (o prazo legal de cada natureza é preenchido em **Por natureza**) |
| Evidência auditável do mês | Aba **Lançar KPIs → Baixar memória de cálculo (.xlsx)** |
| Ver como um protocolo foi calculado | Campo **Protocolo** no topo |
| Backup | **Importar dados → Baixar backup (.json)**, uma vez por mês. O site avisa depois de 30 dias |
| Corrigir regra sem reimportar | Depois de atualizar o código: **Importar dados → Recalcular tudo com a regra atual** |

### Memória de cálculo (auditoria)
O Excel baixado tem uma aba por KPI, com um ato por linha, e a aba **Resumo** com numerador e denominador **em fórmula**.
Na aba **KPI-02**, a coluna *Dias úteis (Excel)* refaz a conta com `NETWORKDAYS` usando a aba **Feriados**. A coluna *Confere?* tem que dar **OK**.
O arquivo não traz nomes de partes nem de colaboradores; o absenteísmo aparece só por matrícula.

---

## Segurança: travas em camadas

1. **Login obrigatório, sem cadastro aberto.** Só entra quem o administrador criar.
2. **Verificação em duas etapas obrigatória.** É exigida **pelo banco**: sem o código do autenticador, a sessão não lê nem grava nada.
3. **Regras de acesso no banco (Row Level Security).** Tudo é negado por padrão. O `admin` lê e grava; o `leitor` só lê. A chave do site é pública por natureza, e quem protege os dados são essas regras.
4. **Nada é apagado pelo site.** "Excluir" arquiva o registro, e o banco não aceita `DELETE`.
5. **Auditoria.** Toda gravação fica registrada em `public.auditoria` (quem, quando, o quê). Pelo site não dá para editar nem apagar esse registro.
6. **Saída automática** após 30 minutos sem uso.
7. **Proteções do site.** Content-Security-Policy, bibliotecas com versão fixa e verificação de integridade (SRI), e nenhum dado no repositório.
8. **Backup mensal fora do Supabase.** O plano gratuito não faz backup automático.

**Para você:** use 2FA no GitHub e no Supabase, senha única e forte, e guarde os backups em local seguro (OneDrive do cartório, por exemplo). Nunca suba arquivos `.json` de backup ou planilhas para este repositório; o `.gitignore` já bloqueia os mais comuns.

### Dar acesso a outras pessoas (Oficial, gestores)
1. Supabase → **Authentication → Users → Add user**.
2. No SQL Editor, rode o mesmo `insert` do passo 3.5 com o e-mail da pessoa e `'leitor'` (só vê) ou `'admin'` (vê e lança).
3. No primeiro login, a pessoa cadastra o próprio autenticador.

Para tirar o acesso:
```sql
delete from public.perfis where user_id = (select id from auth.users where email = 'email@da.pessoa');
```

### Ver o histórico de alterações
```sql
select em, email, acao, colecao, doc_id from public.auditoria order by em desc limit 100;
```

---

## Atualizar o site sem perder dados
O código (este repositório) e os dados (Supabase) ficam separados. Para corrigir algo:
1. Substitua os arquivos alterados aqui no GitHub (**Add file → Upload files**, ou edite pelo lápis).
2. Se a correção mudou uma regra de cálculo, entre no site e clique em **Recalcular tudo com a regra atual**. O painel refaz os meses a partir dos dados brutos guardados, sem reimportar planilhas.
3. Se algo der errado, o GitHub guarda todas as versões anteriores: **Commits → escolha a versão → Revert**.

### Observação sobre o plano gratuito do Supabase
Projeto sem acesso por 7 dias é **pausado** (os dados não somem). Para reativar: painel do Supabase → projeto → **Restore**.

---

## Arquivos
| Arquivo | Para que serve |
|---|---|
| `index.html` | Página e estilos |
| `config.js` | URL e chave pública do Supabase |
| `nuvem.js` | Login, verificação em duas etapas e acesso ao banco |
| `motor.js` | Regras de cálculo (prazo em dias úteis, exigências, cancelamentos, certidões) |
| `app.js` | Telas, abas, relatórios, backup e memória de cálculo |
| `supabase/schema.sql` | Tabelas, travas de acesso e auditoria |
