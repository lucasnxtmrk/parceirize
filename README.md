# 🎯 Parceirize - Plataforma de Clube de Descontos

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)

*Sistema completo de gestão de clube de descontos com arquitetura multi-tenant SaaS*

</div>

## 🆕 Atualizações Recentes

### **🏢 Arquitetura Multi-Tenant Implementada (v2.0)**
- ✅ **Isolamento de dados** por tenant_id com UUID
- ✅ **Sistema de planos** SaaS (Básico, Profissional, Enterprise)
- ✅ **Limitações automáticas** baseadas no plano do provedor
- ✅ **SuperAdmin** para gestão global da plataforma
- ✅ **Provedores** substituíram administradores no modelo de negócio

### **🗄️ Drizzle ORM Integrado**
- ✅ **Schema automático** extraído do banco existente (14 tabelas)
- ✅ **Type Safety** completo com TypeScript
- ✅ **Interface visual** para explorar dados (`npm run db:studio`)
- ✅ **Migrações automáticas** e controle de versão
- ✅ **Comandos de gerenciamento** para stats e cleanup

### **🎯 Lógica de Negócio Refinada**
- ✅ **Provedores** gerenciam apenas clientes e parceiros
- ✅ **Parceiros** gerenciam seus próprios vouchers e produtos
- ✅ **Validação de limites** em tempo real durante criação
- ✅ **Menus específicos** por tipo de usuário
- ✅ **Terminologia padronizada** em todo o sistema

</div>

## 📋 Visão Geral

**Parceirize** é uma plataforma **multi-tenant SaaS** desenvolvida em **Next.js 14** que conecta clientes, parceiros e provedores em um ecossistema de descontos. O sistema oferece:

- 🏢 **Arquitetura Multi-Tenant** com isolamento de dados por provedor
- 💎 **Sistema de Planos** com limitações automáticas (Básico, Profissional, Enterprise)
- 🛡️ **Autenticação segura** com NextAuth.js + JWT e proteção por roles
- 🎨 **Interface moderna** com React 18, Bootstrap 5 e componentes UI avançados
- 🗄️ **Drizzle ORM** para type safety e gestão de schema
- 🔄 **Integração SGP** para sincronização automática de clientes
- 📱 **Carteira digital** com QR codes para validação de vouchers
- 📊 **Dashboards analíticos** com métricas e relatórios em tempo real

### 👥 Perfis de Usuário

| Perfil | Rota Base | Funcionalidades |
|--------|-----------|-----------------|
| **👑 SuperAdmin** | `/superadmin` | Gestão global, provedores, planos |
| **🏢 Provedor** | `/dashboard` | Gestão clientes/parceiros, relatórios, integrações |
| **🛍️ Cliente** | `/carteirinha` | Carteira digital, vouchers, histórico |
| **🏪 Parceiro** | `/painel` | Produtos, vouchers próprios, validações QR |

## 🛠️ Stack Tecnológica

### **Frontend**
- **Next.js 14** (App Router) + **TypeScript**
- **React 18.3** com Server Components
- **Bootstrap 5.3** + React Bootstrap + **SCSS**
- **UI Components**: Radix UI, Material-UI, ApexCharts
- **Funcionalidades**: QR codes, calendários, mapas, gráficos

### **Backend**
- **NextAuth.js** (Credentials + JWT)
- **PostgreSQL** com conexões diretas via `pg`
- **Drizzle ORM** para schema management e type safety
- **API Routes** do Next.js
- **bcryptjs** para hash de senhas

### **Ferramentas**
- **ESLint** + **Prettier** (formatação automática)
- **TypeScript** com path aliases `@/*`
- **Drizzle Kit** para migrações e introspection
- **Bun/npm/yarn** para gerenciamento de pacotes

## 📋 Pré-requisitos

- **Node.js** 18.17+ (recomendado 20 LTS)
- **PostgreSQL** 13+ (recomendado 15+)
- **Gerenciador de pacotes**: npm, yarn ou bun (recomendado)

## 🚀 Instalação e Configuração

### 1. **Clone e Instale Dependências**
```bash
# Clone o repositório
git clone <repo-url>
cd parceirize

# Instale dependências (escolha um)
bun install         # Recomendado (mais rápido)
npm install         # Alternativa
yarn install        # Alternativa
```

### 2. **Configure o Banco de Dados**
```bash
# Execute o script de inicialização
node scripts/run-init.js

# Opcional: adicione dados de exemplo
node scripts/seed.js

# Drizzle: gerar schema do banco existente
npm run db:introspect

# Drizzle: interface visual do banco
npm run db:studio
```

### 3. **Variáveis de Ambiente**
Crie `.env.local` baseado em `.env.example`:

```env
# URL da aplicação
NEXTAUTH_URL=http://localhost:3000

# Banco PostgreSQL
DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_db

# Chave JWT (gere uma segura)
NEXTAUTH_SECRET=sua_chave_super_secreta_aqui_2024
```

### 4. **Executar o Projeto**

```bash
# Desenvolvimento (porta 3000)
bun dev              # Recomendado
npm run dev          # Alternativa

# Build e produção
npm run build        # Build TypeScript + Next.js
npm run start        # Servidor produção (porta 3100)

# Ferramentas de qualidade
npm run lint         # Análise estática
npm run format       # Formatação Prettier
```

> 📌 **Importante**: Em desenvolvimento, mantenha `NEXTAUTH_URL=http://localhost:3000`. Em produção, ajuste para seu domínio.

## 🔐 Autenticação e Autorização

### **Sistema de Login**
- **Provider**: Credentials (email/senha) com hash **bcryptjs**
- **Tabelas**: Consulta unificada em `clientes`, `parceiros` e `admins`
- **JWT**: Dados do usuário armazenados no token para sessão
- **Middleware**: Proteção automática de rotas por role (`src/middleware.js`)

### **Redirecionamentos Automáticos**
| Role | Rota de Destino | Arquivo de Config |
|------|----------------|-------------------|
| `superadmin` | `/superadmin/dashboard` | `src/middleware.js:83` |
| `provedor` | `/dashboard` | `src/middleware.js:85` |
| `cliente` | `/carteirinha` | `src/middleware.js:87` |
| `parceiro` | `/painel` | `src/middleware.js:89` |

### **Proteção de Rotas**
```javascript
// src/middleware.js - Proteção automática
/superadmin/*       → Apenas superadmin
/(administrador)/*  → Apenas provedor + superadmin
/(clientes)/*       → Apenas cliente  
/(parceiros)/*      → Apenas parceiro
```

## 🗄️ Estrutura do Banco de Dados

### **Tabelas Principais**
```sql
-- Multi-Tenant Architecture
provedores   → id, tenant_id, nome_empresa, email, plano_id, ativo
planos       → id, nome, limite_clientes, limite_parceiros, limite_vouchers
superadmins  → id, email, senha
tenant_logs  → id, tenant_id, usuario_tipo, acao, detalhes

-- Usuários do sistema (por tenant)
clientes     → id, nome, sobrenome, email, senha, id_carteirinha, tenant_id
parceiros    → id, nome_empresa, email, senha, nicho, foto, tenant_id
admins       → id, email, senha (legado)

-- Sistema de vouchers/produtos
vouchers     → id, codigo, desconto, parceiro_id, data_criacao
produtos     → id, nome, descricao, preco, parceiro_id, desconto
pedidos      → id, cliente_id, qr_code, status, total, tenant_id
pedido_itens → id, pedido_id, produto_id, quantidade, preco_unitario

-- Integrações externas
integracoes  → id, admin_id, tipo, subdominio, token, app_name
```

### **Utilitários**
```bash
# Gerar hash de senha para seeds/testes
node gerar_hash.js

# Inicializar tabelas
node scripts/run-init.js

# Drizzle: comandos de gerenciamento
npm run db:generate      # Gerar migrações
npm run db:migrate       # Aplicar migrações
npm run db:push          # Sincronizar schema
npm run db:studio        # Interface visual
npm run db:stats         # Estatísticas das tabelas
npm run db:cleanup       # Limpar dados de teste
```

## 📂 Arquitetura do Projeto

### **Estrutura de Pastas**
```
src/
├── app/                          # App Router do Next.js 14
│   ├── (administrador)/          # 🏢 Rotas protegidas para provedores
│   ├── (clientes)/               # 🛍️ Rotas protegidas para clientes  
│   ├── (parceiros)/              # 🏪 Rotas protegidas para parceiros
│   ├── (other)/                  # 🌐 Rotas públicas (auth, errors)
│   ├── superadmin/               # 👑 Rotas protegidas para superadmin
│   ├── api/                      # 🔗 API Routes do Next.js
│   └── layout.jsx                # 🎨 Layout raiz + splash screen
├── components/                   # 🧩 Componentes UI reutilizáveis
├── context/                      # 🔄 Estados globais React
├── db/                           # 🗄️ Drizzle ORM (schema, connection, migrations)
├── lib/                          # 📚 Utilitários (tenant-helper, etc.)
├── middleware.js                 # 🛡️ Proteção de rotas por role
└── utils/                        # 🛠️ Utilitários e helpers
```

## 🔗 API Endpoints

### **Autenticação**
- `POST /api/auth/signin` → Login com credenciais
- `POST /api/auth/signout` → Logout seguro

### **APIs por Perfil**

#### 👑 **SuperAdmin** (`/api/superadmin/*`)
```bash
GET    /api/superadmin/provedores       # Gestão global de provedores
GET    /api/superadmin/dashboard-stats  # Métricas globais do sistema
POST   /api/superadmin/planos           # Gestão de planos SaaS
```

#### 🏢 **Provedor** (`/api/admin/*`)
```bash
GET    /api/admin/clientes              # Listar/gerenciar clientes (tenant isolado)
GET    /api/admin/parceiros             # Listar/gerenciar parceiros (tenant isolado)
GET    /api/admin/dashboard-stats       # Métricas do dashboard (tenant isolado)
GET    /api/admin/perfil                # Perfil do provedor
POST   /api/admin/integracoes/sgp       # Integrações SGP
```

#### 🛍️ **Cliente** (`/api/cliente/*`)
```bash
GET    /api/cliente/economia-historica  # Histórico de economia
GET    /api/vouchers                    # Vouchers disponíveis
POST   /api/validarVoucher              # Usar voucher
GET    /api/produtos                    # Catálogo de produtos
```

#### 🏪 **Parceiro** (`/api/parceiro/*`) 
```bash
GET    /api/parceiro/perfil             # Dados do parceiro
GET    /api/parceiro/dashboard          # Métricas de vendas
GET    /api/parceiro/produtos           # Produtos do parceiro
GET    /api/parceiro/vouchers           # Vouchers próprios (gestão)
POST   /api/parceiro/vouchers           # Criar vouchers próprios
PUT    /api/parceiro/vouchers           # Editar vouchers próprios
DELETE /api/parceiro/vouchers           # Remover vouchers próprios
```

### **Integrações Externas**
- `POST /api/admin/integracoes/sgp/sincronizar` → Sync automática SGP
- `GET /api/nichos` → Categorias de parceiros

## 🛠️ Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| **Desenvolvimento** | `bun dev` | Servidor dev (porta 3000) |
| **Build** | `npm run build` | Build TypeScript + Next.js |
| **Produção** | `npm run start` | Servidor produção (porta 3100) |
| **Qualidade** | `npm run lint` | Análise estática ESLint |
| **Formatação** | `npm run format` | Prettier (150 chars, sem ;) |
| **Senha Hash** | `node gerar_hash.js` | Gerar hash bcrypt |
| **Init DB** | `node scripts/run-init.js` | Inicializar banco |
| **DB Schema** | `npm run db:introspect` | Gerar schema do banco |
| **DB Studio** | `npm run db:studio` | Interface visual do banco |
| **DB Stats** | `npm run db:stats` | Estatísticas das tabelas |
| **DB Cleanup** | `npm run db:cleanup` | Limpar dados de teste |

## 🚀 Implantação (Deploy)

### **Build e Produção**
```bash
# 1. Build da aplicação
npm run build

# 2. Configurar variáveis de produção
export NEXTAUTH_URL="https://seudominio.com"
export DATABASE_URL="postgresql://user:pass@servidor:5432/db"
export NEXTAUTH_SECRET="chave_jwt_super_segura_produção"

# 3. Iniciar servidor (porta 3100)
npm run start
```

### **Proxy Reverso (Nginx)**
```nginx
server {
    listen 80;
    server_name seudominio.com;
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## ⚙️ Configurações

### **Arquivos de Config**
- `next.config.js` → React Strict Mode, variáveis de ambiente
- `tsconfig.json` → TypeScript + paths aliases `@/*`
- `.eslintrc.json` → Regras de linting
- `.prettierrc.json` → Formatação (150 chars, sem semicolons)

## 🔧 Solução de Problemas

### **Erros Comuns**

| Problema | Causa | Solução |
|----------|-------|---------|
| **Callback/CSRF erro** | `NEXTAUTH_URL` incorreta | Verificar URL exata da aplicação |
| **Falha conexão DB** | `DATABASE_URL` inválida | Testar conexão PostgreSQL |
| **Login falha sempre** | Hash bcrypt incompatível | Usar `node gerar_hash.js` |
| **Página `/not-authorized`** | Role incorreta | Verificar permissões do usuário |
| **Build falha** | Erro TypeScript | Executar `npm run lint` |

### **Logs de Debug**
```bash
# Verificar logs do NextAuth
DEBUG=nextauth* npm run dev

# Logs do banco de dados
tail -f /var/log/postgresql/postgresql.log
```

## 🔄 Integração SGP (Sistema de Gestão)

A plataforma suporta **integração automática** com sistemas SGP para sincronização de clientes.

### **Configuração**
1. **Acesso**: Parceiro → `/(parceiros)/integracoes`
2. **Campos obrigatórios**:
   - **Subdomínio**: URL base do SGP
   - **Token**: Bearer token de autenticação
   - **Modo**: `manual` ou `integracao` (sync automática)

### **Funcionalidades**
- ✅ **Importação manual** de clientes ativos do SGP
- ✅ **Sincronização automática** de status (ativo/inativo)
- ✅ **Bloqueio de login** para clientes inativos
- ✅ **Senhas padronizadas** para novos clientes

### **Endpoints da Integração**
```bash
POST /api/parceiro/integracoes/sgp           # Salvar configuração
POST /api/parceiro/integracoes/sgp/importar  # Importar clientes ativos  
GET  /api/parceiro/integracoes/sgp/sincronizar # Sync automática (cron)
```

### **Tabela de Controle**
```sql
-- Configurações de integração por parceiro
integracoes → id, parceiro_id, tipo, subdominio, token, modo_ativacao

-- Status de clientes (sincronizado com SGP)  
clientes.ativo → BOOLEAN (bloqueia login se FALSE)
```

## 📄 Licença

**Uso interno/privado** - Sistema proprietário da NEXTMARK

---

<div align="center">

**🎯 Parceirize** - *Conectando clientes, parceiros e descontos*

Desenvolvido com ❤️ usando **Next.js 14** + **TypeScript** + **PostgreSQL**

</div>
