# 🧪 Guia de Teste - Domínios Personalizados no Localhost

## 🚀 Configuração Rápida

### 1. Editar Arquivo Hosts
**Como administrador**, edite o arquivo:
- **Windows:** `C:\Windows\System32\drivers\etc\hosts`
- **Linux/Mac:** `/etc/hosts`

Adicione estas linhas:
```
127.0.0.1 empresa1.localhost
127.0.0.1 empresa2.localhost
127.0.0.1 clube.localhost
```

### 2. Iniciar o Sistema
```bash
npm run dev
# ou
bun dev
```

## 🎯 Cenários de Teste

### **Cenário 1: Login Multi-Tenant**

1. **Acesse:** http://empresa1.localhost:3000/auth/login
2. **Login como provedor:** empresa1@teste.com / 123456
3. **Verificar:** Dashboard redirecionará para `/dashboard`
4. **Confirmar:** Headers mostram tenant correto

### **Cenário 2: Cliente Isolado**

1. **Acesse:** http://empresa1.localhost:3000/auth/login?tab=cliente
2. **Login como cliente:** cliente1@teste.com / 123456
3. **Verificar:** Redirecionamento para `/carteirinha`
4. **Testar isolamento:** Cliente só vê dados da Empresa 1

### **Cenário 3: Troca de Tenant**

1. **Logout da Empresa 1**
2. **Acesse:** http://empresa2.localhost:3000/auth/login
3. **Login:** empresa2@teste.com / 123456
4. **Verificar:** Dados completamente diferentes
5. **Confirmar:** Isolamento total entre empresas

### **Cenário 4: Gestão de Domínios**

1. **Login como provedor em:** http://localhost:3000/auth/login-admin
2. **Credenciais:** empresa1@teste.com / 123456
3. **Acesse:** /admin-configuracoes/dominios
4. **Verificar:** Lista de domínios da empresa
5. **Testar:** Adicionar novo domínio de teste

### **Cenário 5: Subdomínio vs Personalizado**

1. **Teste subdomínio:** http://empresa1.parceirize.com:3000
2. **Teste personalizado:** http://empresa1.localhost:3000
3. **Verificar:** Ambos detectam o mesmo tenant
4. **Confirmar:** Headers `x-tenant-domain` diferentes

## 📊 Dados de Teste Criados

### **Provedores**
| Email | Senha | Domínios |
|-------|-------|----------|
| empresa1@teste.com | 123456 | empresa1.localhost, empresa1.parceirize.com |
| empresa2@teste.com | 123456 | empresa2.localhost, empresa2.parceirize.com |
| clube@teste.com | 123456 | clube.localhost, clube.parceirize.com |

### **Clientes**
| Email | Senha | Tenant |
|-------|-------|--------|
| cliente1@teste.com | 123456 | Empresa 1 |
| cliente2@teste.com | 123456 | Empresa 2 |
| cliente3@teste.com | 123456 | Clube |

### **Parceiros**
| Email | Senha | Tenant |
|-------|-------|--------|
| parceiro1@teste.com | 123456 | Empresa 1 |
| parceiro2@teste.com | 123456 | Empresa 2 |
| parceiro3@teste.com | 123456 | Clube |

## 🔍 Como Verificar se Está Funcionando

### **1. Headers HTTP**
Abra DevTools → Network → Selecione qualquer requisição → Headers
Procure por:
```
x-tenant-id: uuid-do-tenant
x-tenant-domain: empresa1.localhost
x-tenant-type: personalizado
x-provider-name: Empresa Teste 1
```

### **2. Console do Navegador**
Deve mostrar logs do middleware:
```
🎭 Middleware - Path: /dashboard, Role: provedor, DomainTenant: uuid-xxx
✅ Middleware passou todas as verificações...
```

### **3. Cookies**
DevTools → Application → Cookies
Verificar se cookies estão sendo definidos para o domínio correto.

### **4. Banco de Dados**
```sql
-- Verificar logs de acesso
SELECT * FROM acessos_dominio ORDER BY criado_em DESC LIMIT 10;

-- Verificar detecção de domínios
SELECT * FROM buscar_provedor_por_dominio('empresa1.localhost');
```

## 🐛 Troubleshooting

### **Problema: Domínio não é detectado**
```bash
# Verificar se hosts foi atualizado
ping empresa1.localhost

# Deve retornar 127.0.0.1
```

### **Problema: Cookies não funcionam**
1. Limpar todos os cookies do navegador
2. Verificar se está usando :3000 na URL
3. Tentar em aba privada

### **Problema: Middleware não detecta tenant**
1. Verificar logs no terminal do servidor
2. Confirmar se domínio está no banco:
```sql
SELECT * FROM dominios_personalizados WHERE dominio = 'empresa1.localhost';
```

### **Problema: Login não funciona**
1. Verificar se usuário existe no tenant correto
2. Confirmar senha: 123456
3. Verificar logs de autenticação

## 🧪 Testes Automatizados

Execute os testes para verificar integridade:
```bash
# Teste completo do sistema
node scripts/test-custom-domains.js

# Recriar dados de teste se necessário
node scripts/setup-local-domains.js
```

## 📈 Métricas para Verificar

### **Analytics**
- Acesse: http://localhost:3000/admin-configuracoes/dominios
- Clique em "Estatísticas"
- Verifique se há dados de acesso

### **Logs de Acesso**
```sql
SELECT
  d.dominio,
  a.path,
  a.criado_em,
  a.ip_address
FROM acessos_dominio a
JOIN dominios_personalizados d ON a.dominio_id = d.id
ORDER BY a.criado_em DESC;
```

## ✅ Checklist de Validação

- [ ] Arquivo hosts configurado
- [ ] Servidor rodando na porta 3000
- [ ] empresa1.localhost:3000 resolve
- [ ] Login funciona em cada domínio
- [ ] Headers x-tenant-* aparecem
- [ ] Dados isolados por tenant
- [ ] Gestão de domínios acessível
- [ ] Estatísticas sendo geradas
- [ ] Logs de acesso gravados

## 🎉 Resultado Esperado

Quando tudo estiver funcionando:
1. **Cada domínio** detecta automaticamente seu tenant
2. **Usuários são isolados** por empresa
3. **Login funciona** em qualquer domínio
4. **Analytics são gerados** por domínio
5. **Interface de gestão** mostra todos os domínios
6. **Sistema é completamente white-label**

---

**Próximo passo:** Testar em produção com domínios reais! 🚀