Parceirize — Clube de Descontos (Next.js 14)

Descrição

- Plataforma web para gerenciamento e uso de descontos com três perfis de acesso: administrador, cliente e parceiro.
- Autenticação via credenciais (email/senha) usando NextAuth + JWT com proteção de rotas por middleware e redirecionamento por perfil.
- Persistência em PostgreSQL utilizando `pg` e consultas SQL diretas.
- UI baseada em React 18 + Next.js (App Router), Bootstrap 5/SCSS e diversos componentes (calendário, gráficos, mapas, etc.).

Stack

- Framework: Next.js 14 (App Router)
- Linguagem: TypeScript/JavaScript (React 18)
- Autenticação: NextAuth (Credentials Provider + JWT)
- Banco de dados: PostgreSQL (`pg`)
- Estilo/UI: Bootstrap 5, SCSS, React Bootstrap, ApexCharts, FullCalendar, Swiper
- Utilitários: Day.js, Yup, React Hook Form, Toastify

Pré‑requisitos

- Node.js 18.17+ (recomendado 18 LTS)
- PostgreSQL 13+ (recomendado 14 ou superior)
- Gerenciador de pacotes: npm, yarn ou bun

Instalação

1. Instale dependências
   - npm: `npm install`
   - yarn: `yarn`
   - bun: `bun install`
2. Variáveis de ambiente
   - Crie um arquivo `.env.local` para desenvolvimento com base no `.env.example`.
   - Produção: use `.env.production` (ou variáveis no ambiente de execução).
   - Variáveis mínimas:
     - `NEXTAUTH_URL` — URL base do app (ex.: `http://localhost:3000` em dev)
     - `DATABASE_URL` — conexão PostgreSQL (ex.: `postgresql://usuario:senha@localhost:5432/protege`)
     - `NEXTAUTH_SECRET` — segredo para assinar JWT (use um valor forte)

Execução

- Desenvolvimento (porta 3000): `npm run dev`
  - Acesse: `http://localhost:3000`
- Build de produção: `npm run build`
- Start de produção (porta 3100): `npm run start`
  - Acesse: `http://localhost:3100`

Importante: no desenvolvimento, deixe `NEXTAUTH_URL` alinhado com a porta em uso (3000 por padrão). Em produção, ajuste para o domínio público.

Autenticação e Autorização

- Provider: Credentials (email/senha) com verificação via `bcrypt`.
- Tabelas consultadas no login: `clientes`, `parceiros`, `admins`.
- Após login, NextAuth grava os dados do usuário no JWT e na sessão.
- Redirecionamento por perfil (ver callbacks em `src/app/api/auth/[...nextauth]/options.js`):
  - admin → `/dashboard`
  - cliente → `/carteirinha`
  - parceiro → `/painel`
- Proteção de rotas por middleware: `src/middleware.js`
  - Bloqueia acesso não autenticado
  - Restringe `/（administrador）`, `/（clientes）`, `/（parceiros）` por role

Banco de Dados (visão geral mínima)

O projeto consulta as seguintes estruturas (exemplos mínimos, ajuste ao seu schema real):

- clientes: `id`, `nome`, `sobrenome`, `email`, `id_carteirinha`, `data_ultimo_voucher`, `senha`
- parceiros: `id`, `nome_empresa`, `email`, `senha`, `nicho`, `foto`
- admins: `id`, `email`, `senha`
- vouchers: `id`, `codigo`, `desconto`, `parceiro_id`, `data_criacao`

Para gerar hash de senha (bcrypt) para seeds/testes:

- Rode `node gerar_hash.js` e copie o hash gerado para o campo `senha`.

Principais Pastas

- `src/app` — App Router e páginas segmentadas por perfil
  - `(administrador)`, `(clientes)`, `(parceiros)`, `(other)`
  - `api/` — rotas de API (Next.js Route Handlers)
  - `layout.jsx` — layout raiz e carregamento inicial
- `src/middleware.js` — proteção e redirecionamento por role
- `src/lib` — utilidades de auth (ex.: `auth.js` reexporta opções do NextAuth)
- `src/components` — componentes UI reutilizáveis
- `src/context`, `src/hooks`, `src/utils` — estado, hooks e utilitários
- `public/` — recursos estáticos

API (resumo das rotas)

- `src/app/api/auth/[...nextauth]` — autenticação (Credentials + JWT)
- `src/app/api/vouchers` — lista vouchers (join com `parceiros`)
- `src/app/api/validarVoucher` — validação de voucher
- `src/app/api/nichos` — nichos de parceiros
- `src/app/api/parceiro/*` — dados de parceiro autenticado
  - `perfil` — informa dados do parceiro logado
  - `voucher` — lista vouchers do parceiro logado
  - `vouchers-utilizados` — estatísticas/uso de vouchers
  - `integracoes/sgp` — GET/POST configurações da integração SGP (subdomínio, token, modo)
  - `integracoes/sgp/importar` — POST importa clientes ativos do SGP
  - `integracoes/sgp/sincronizar` — GET sincroniza status ativo/inativo conforme SGP
- `src/app/api/admin/*` — endpoints administrativos
  - `clientes` — gestão de clientes
  - `parceiros` — gestão de parceiros
  - `relatorios/vouchers-utilizados` — relatórios
  - `validarVoucher` — validação administrativa
  - `verify-carteirinha` — verificação de carteirinha

Scripts Úteis

- `npm run lint` — análise estática
- `npm run format` — formatação do código (Prettier)
- `node gerar_hash.js` — gerar hash bcrypt de senha

Configurações e Ambiente

- `next.config.js` — ativa `reactStrictMode` e expõe `NEXTAUTH_SECRET`. Carrega `.env.local` via `dotenv`.
- `tsconfig.json`, `.eslintrc.json`, `.prettierrc.json` — base de TypeScript, ESLint e Prettier.

Implantação

- Gere o build: `npm run build`
- Defina as variáveis de ambiente de produção (`NEXTAUTH_URL`, `DATABASE_URL`, `NEXTAUTH_SECRET`).
- Inicie o servidor: `npm run start` (porta 3100 por padrão)
- Coloque um proxy reverso (Nginx/Caddy) apontando para a porta do Node.

Solução de Problemas

- Erro de callback/CSRF após login
  - Verifique `NEXTAUTH_URL` (precisa coincidir com a URL/porta real)
- Falha ao conectar no banco
  - Teste `DATABASE_URL` e permissões do usuário no PostgreSQL
- Login sempre falha
  - Confirme que `senha` no banco está com hash `bcrypt` compatível
- Página redireciona para `/not-authorized`
  - Usuário logado não tem a role correta para a rota acessada

Integração SGP

- Configuração pelo painel do parceiro em `/(parceiros)/integracoes`.
- Campos: subdomínio, token (Bearer) e modo de ativação (manual/integracao).
- Importação manual em `/(parceiros)/clientes` via botão “Importar da Integração”.
- Endpoints chamados:
  - `POST /api/parceiro/integracoes/sgp` — salva config
  - `POST /api/parceiro/integracoes/sgp/importar` — importa clientes ativos (senha padrão informada)
  - `GET /api/parceiro/integracoes/sgp/sincronizar` — atualiza status (ativo/inativo) se o modo for `integracao`
- Banco:
  - Tabela `integracoes` criada em `scripts/init.sql`
  - Coluna `clientes.ativo` adicionada para suportar login condicionado
- Login: clientes inativos não autenticam no sistema (verificação em NextAuth `options.js`).

Licença

- Uso interno/privado (sem licença pública definida neste repositório).
