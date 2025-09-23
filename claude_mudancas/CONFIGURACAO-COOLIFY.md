# 🚀 Configuração Coolify - Domínios Personalizados

## 📋 Checklist de Implementação

### 1. **DNS Configurado** ✅
```
parceirize.com         A    SEU_IP_SERVIDOR
*.parceirize.com       A    SEU_IP_SERVIDOR
admin.parceirize.com.br A   SEU_IP_SERVIDOR
```

### 2. **Configuração no Coolify**

#### A) **Domínios do Projeto**
No painel Coolify > Seu Projeto > Domains, adicione:

```
parceirize.com
*.parceirize.com
admin.parceirize.com.br
```

#### B) **Variáveis de Ambiente**
No Coolify > Environment Variables:

```env
# URLs principais
NEXTAUTH_URL=https://parceirize.com
NEXTAUTH_URL_INTERNAL=https://parceirize.com

# Configurações de domínios personalizados
ALLOWED_DOMAINS=parceirize.com,*.parceirize.com,*.parceirize.com.br
COOKIE_DOMAIN=.parceirize.com
ENABLE_CUSTOM_DOMAINS=true
PRIMARY_DOMAIN=parceirize.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# NextAuth
NEXTAUTH_SECRET=seu_nextauth_secret_forte_aqui

# Outras variáveis existentes...
```

#### C) **SSL/HTTPS**
1. Vá em **Settings** > **SSL**
2. Habilite **Let's Encrypt**
3. Se disponível, marque **Wildcard Certificate**
4. O Coolify gerará certificados automaticamente

### 3. **Configuração de Proxy**

O Coolify usa **Traefik** como proxy reverso. Ele já suporta wildcard domains automaticamente quando configurado corretamente.

#### Verificar se o Traefik está configurado para wildcards:
- No painel Coolify, verifique se há labels como:
  ```
  traefik.http.routers.parceirize.rule=Host(`parceirize.com`) || HostRegexp(`{subdomain:[a-z0-9-]+}.parceirize.com`)
  ```

### 4. **Deploy e Teste**

#### Após configurar:
1. **Redeploy** o projeto no Coolify
2. Aguarde o SSL ser gerado (2-5 minutos)
3. Teste os domínios:

```bash
# Teste domínio principal
curl -I https://parceirize.com

# Teste subdomínio
curl -I https://teste.parceirize.com

# Teste admin
curl -I https://admin.parceirize.com.br
```

### 5. **Configurações Avançadas (Opcional)**

#### A) **Headers de Segurança**
Adicione no Coolify > Settings > Headers:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

#### B) **Rate Limiting**
Configure no Traefik se necessário:
```yaml
# traefik.yml
http:
  middlewares:
    rateLimit:
      rateLimit:
        burst: 100
        average: 50
```

### 6. **Monitoramento**

#### Logs importantes:
```bash
# Logs do Coolify
docker logs coolify

# Logs do Traefik
docker logs traefik

# Logs da aplicação
docker logs parceirize
```

#### Verificar SSL:
```bash
# Verificar certificado
openssl s_client -connect parceirize.com:443 -servername parceirize.com

# Teste wildcard
openssl s_client -connect teste.parceirize.com:443 -servername teste.parceirize.com
```

## 🐛 Troubleshooting

### Problema: Domínio não responde
1. Verificar DNS propagação: `nslookup parceirize.com`
2. Verificar se Coolify está rodando: `docker ps`
3. Checar logs do Traefik: `docker logs traefik`

### Problema: SSL não funciona
1. Aguardar propagação (até 10 minutos)
2. Verificar se Let's Encrypt tem limite de rate
3. Verificar logs: `docker logs coolify`

### Problema: Subdomínios não funcionam
1. Verificar wildcard DNS: `nslookup teste.parceirize.com`
2. Verificar configuração Traefik
3. Testar manualmente: `curl -H "Host: teste.parceirize.com" http://SEU_IP`

## 📝 Próximos Passos

Após deploy:

1. **Teste todos os fluxos**:
   - Login em diferentes subdomínios
   - Criação de novos provedores
   - Validação de domínios personalizados

2. **Configurar monitoramento**:
   - Analytics de domínios
   - Alertas de SSL
   - Logs de acesso

3. **Performance**:
   - CDN (Cloudflare)
   - Cache de assets
   - Compressão gzip

## 🔧 Comandos Úteis

```bash
# Verificar status do Coolify
docker ps | grep coolify

# Restart serviços
docker restart traefik
docker restart coolify

# Ver logs em tempo real
docker logs -f parceirize

# Testar configuração
curl -v https://parceirize.com
```

---

**Implementado por:** NEXTMARK
**Data:** Janeiro 2025
**Status:** Pronto para deploy