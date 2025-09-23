# 🌐 Sistema de Domínios Personalizados - Parceirize

Sistema completo para permitir que provedores configurem seus próprios domínios e subdomínios personalizados.

## 📋 Recursos Implementados

### ✅ Backend
- [x] Migração do banco de dados com tabelas `dominios_personalizados` e `acessos_dominio`
- [x] Funções SQL para busca e validação de domínios
- [x] Middleware aprimorado para detecção automática de tenants por domínio
- [x] NextAuth configurado para suportar cookies multi-domínio
- [x] APIs completas para gestão de domínios (`/api/admin/dominios/*`)
- [x] Sistema de verificação DNS automático
- [x] Logs de acesso e analytics por domínio
- [x] Helpers para validação e gestão de domínios

### ✅ Frontend
- [x] Interface completa de gestão em `/admin-configuracoes/dominios`
- [x] Modal para adicionar novos domínios
- [x] Instruções automáticas de configuração DNS
- [x] Dashboard de estatísticas e analytics
- [x] Verificação em tempo real do status dos domínios

### ✅ Segurança
- [x] Validação de propriedade de domínio via DNS TXT
- [x] Isolamento de dados por tenant
- [x] Prevenção de ataques de domain takeover
- [x] Configuração segura de cookies cross-domain

## 🗄️ Estrutura do Banco de Dados

### Tabela `dominios_personalizados`
```sql
- id (SERIAL PRIMARY KEY)
- provedor_id (INT) - Referência ao provedor
- dominio (VARCHAR) - Domínio completo (ex: clube.empresa.com)
- tipo (VARCHAR) - 'subdominio' ou 'personalizado'
- verificado (BOOLEAN) - Se o domínio foi verificado
- verificacao_token (VARCHAR) - Token para verificação DNS
- verificacao_metodo (VARCHAR) - 'dns_txt' ou 'meta_tag'
- ssl_status (VARCHAR) - Status do certificado SSL
- ativo (BOOLEAN) - Se o domínio está ativo
- criado_em, verificado_em, ultimo_acesso (TIMESTAMP)
```

### Tabela `acessos_dominio`
```sql
- id (SERIAL PRIMARY KEY)
- dominio_id (INT) - Referência ao domínio
- provedor_id (INT) - Referência ao provedor
- ip_address (INET) - IP do visitante
- user_agent (TEXT) - User agent do navegador
- path (VARCHAR) - Página acessada
- metodo (VARCHAR) - GET, POST, etc.
- status_code (INT) - Código de resposta HTTP
- tempo_resposta_ms (INT) - Tempo de resposta
- user_id (INT) - ID do usuário (se logado)
- user_tipo (VARCHAR) - Tipo do usuário
- criado_em (TIMESTAMP)
```

## 🚀 Como Implementar

### 1. Executar Migração
```bash
# Executar a migração do banco
node scripts/run-custom-domains-migration.js

# Verificar se tudo funcionou
node scripts/test-custom-domains.js
```

### 2. Configurar Variáveis de Ambiente
Adicionar ao `.env`:
```env
# URLs do NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000

# Configurações de domínios personalizados
ALLOWED_DOMAINS=parceirize.com,*.parceirize.com
COOKIE_DOMAIN=.parceirize.com
ENABLE_CUSTOM_DOMAINS=true
PRIMARY_DOMAIN=parceirize.com
```

### 3. Configurar DNS (Produção)
```bash
# DNS Wildcard para subdomínios
*.parceirize.com A 192.168.1.100

# Exemplo de registro TXT para verificação
_parceirize.clube.empresa.com TXT "parceirize-verify-abc123..."
```

### 4. Configurar Servidor Web (Nginx)
```nginx
# Configuração para múltiplos domínios
server {
    server_name *.parceirize.com ~^(?<domain>.+)$;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Configurar SSL (Certbot)
```bash
# Certificado wildcard para subdomínios
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/certbot/cloudflare.ini \
  -d '*.parceirize.com' \
  -d 'parceirize.com'
```

## 🎯 Como Usar

### Para Provedores

1. **Acessar Gestão de Domínios**
   - Ir em `/admin-configuracoes/dominios`

2. **Adicionar Domínio Personalizado**
   - Clicar em "Adicionar Domínio"
   - Inserir domínio: `clube.empresa.com.br`
   - Receber instruções de configuração DNS

3. **Configurar DNS**
   - Adicionar registro TXT: `_parceirize.clube.empresa.com.br TXT "parceirize-verify-abc123..."`
   - Aguardar propagação (até 24h)

4. **Verificar Domínio**
   - Clicar em "Verificar" na interface
   - Sistema confirmará automaticamente quando DNS estiver configurado

5. **Usar Domínio**
   - Clientes: `https://clube.empresa.com.br/carteirinha`
   - Parceiros: `https://clube.empresa.com.br/painel`
   - Login: `https://clube.empresa.com.br/auth/login`

### Para Clientes/Parceiros

- Acessar através do domínio personalizado do provedor
- Sistema detectará automaticamente o tenant
- Login e navegação funcionam normalmente
- Isolamento completo de dados

## 📊 Analytics e Monitoramento

### Métricas Disponíveis
- Total de acessos por domínio
- IPs únicos por período
- Páginas mais visitadas
- Tempo de resposta médio
- Status codes de resposta
- Acessos por tipo de usuário

### Exportação
- CSV com dados históricos
- Relatórios por período
- Estatísticas em tempo real

## 🔧 APIs Disponíveis

### Gestão de Domínios
```javascript
// Listar domínios
GET /api/admin/dominios

// Adicionar domínio
POST /api/admin/dominios
{
  "dominio": "clube.empresa.com.br",
  "tipo": "personalizado"
}

// Verificar domínio
POST /api/admin/dominios/verificar
{
  "dominio_id": 123
}

// Remover domínio
DELETE /api/admin/dominios?id=123
```

### Estatísticas
```javascript
// Estatísticas gerais
GET /api/admin/dominios/stats?periodo=30

// Exportar dados
POST /api/admin/dominios/stats/export
{
  "periodo": "30",
  "formato": "csv"
}
```

## 🛠️ Arquivos Principais

### Backend
- `src/middleware.js` - Detecção automática de tenant por domínio
- `src/lib/domain-helper.js` - Helper para operações de domínio
- `src/lib/cookie-helper.js` - Gestão de cookies multi-domínio
- `src/app/api/auth/[...nextauth]/options.js` - NextAuth dinâmico
- `src/app/api/admin/dominios/` - APIs de gestão

### Frontend
- `src/app/(administrador)/admin-configuracoes/dominios/page.jsx` - Interface principal

### Banco de Dados
- `scripts/add-custom-domains.sql` - Migração completa
- `scripts/run-custom-domains-migration.js` - Executor da migração
- `scripts/test-custom-domains.js` - Testes automatizados

## ⚠️ Considerações de Segurança

### Validações Implementadas
- ✅ Verificação de propriedade por DNS TXT
- ✅ Prevenção de domain takeover
- ✅ Validação de formatos de domínio
- ✅ Isolamento de dados por tenant
- ✅ Rate limiting nas APIs
- ✅ Sanitização de inputs

### Configurações de Segurança
- Headers de segurança automáticos
- Cookies httpOnly e secure
- Validação de CSP
- Proteção contra XSS e CSRF

## 🚨 Troubleshooting

### Domínio não é detectado
1. Verificar se DNS está propagado: `nslookup _parceirize.seudominio.com`
2. Conferir se registro TXT está correto
3. Verificar logs do sistema: tabela `acessos_dominio`

### Cookies não funcionam entre domínios
1. Verificar configuração `COOKIE_DOMAIN`
2. Conferir se SSL está ativo em produção
3. Validar configuração do NextAuth

### Performance
1. Monitorar logs de acesso
2. Verificar índices do banco de dados
3. Configurar cache no servidor web

## 📈 Próximos Passos (Opcionais)

### Funcionalidades Avançadas
- [ ] Certificados SSL automáticos via Let's Encrypt
- [ ] Interface para configuração de DNS automática
- [ ] Branding personalizado por domínio
- [ ] CDN e cache por domínio
- [ ] API webhooks para eventos de domínio

### Melhorias de Performance
- [ ] Cache Redis para detecção de domínios
- [ ] Compressão de assets por domínio
- [ ] Otimização de queries SQL
- [ ] Load balancing por tenant

## 💡 Suporte

Para questões técnicas ou implementação:
1. Verificar logs em `acessos_dominio`
2. Executar `scripts/test-custom-domains.js`
3. Consultar documentação do provedor DNS
4. Contatar suporte técnico da NEXTMARK

---

**Sistema implementado por:** NEXTMARK
**Data:** Janeiro 2025
**Versão:** 1.0.0