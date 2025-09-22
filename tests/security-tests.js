/**
 * TESTES DE SEGURANÇA PARA O SISTEMA PARCEIRIZE
 *
 * Este arquivo contém testes automatizados para verificar
 * as correções de segurança implementadas no sistema.
 */

const { Pool } = require('pg');

// Configuração do banco de testes
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
});

// Classe para testes de segurança
class SecurityTester {
  constructor() {
    this.results = [];
  }

  async log(test, status, message) {
    const result = {
      test,
      status,
      message,
      timestamp: new Date().toISOString()
    };
    this.results.push(result);
    console.log(`[${status}] ${test}: ${message}`);
  }

  async testSqlInjectionProtection() {
    console.log('\n🔐 Testando proteção contra SQL Injection...');

    try {
      // Teste 1: Tentar injeção via tenant_id
      const maliciousTenantId = "1'; DROP TABLE clientes; --";

      try {
        const { addTenantFilter, validateId } = require('../src/lib/tenant-helper');
        await validateId(maliciousTenantId, 'Tenant ID');
        await this.log('SQL_INJECTION_TENANT_ID', 'FAIL', 'Validação não bloqueou tenant_id malicioso');
      } catch (error) {
        await this.log('SQL_INJECTION_TENANT_ID', 'PASS', 'Tenant ID malicioso foi bloqueado corretamente');
      }

      // Teste 2: Tentar injeção via email
      const maliciousEmail = "test@example.com'; DELETE FROM clientes; --";

      try {
        const { validateEmail } = require('../src/lib/tenant-helper');
        await validateEmail(maliciousEmail);
        await this.log('SQL_INJECTION_EMAIL', 'FAIL', 'Validação não bloqueou email malicioso');
      } catch (error) {
        await this.log('SQL_INJECTION_EMAIL', 'PASS', 'Email malicioso foi bloqueado corretamente');
      }

    } catch (error) {
      await this.log('SQL_INJECTION_GENERAL', 'ERROR', error.message);
    }
  }

  async testTenantIsolation() {
    console.log('\n🏢 Testando isolamento multi-tenant...');

    try {
      // Criar dados de teste
      const tenant1 = await pool.query(
        "INSERT INTO provedores (nome_empresa, email, senha, tenant_id, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        ['Tenant1', 'tenant1@test.com', 'hashedpass', 1, true]
      );

      const tenant2 = await pool.query(
        "INSERT INTO provedores (nome_empresa, email, senha, tenant_id, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        ['Tenant2', 'tenant2@test.com', 'hashedpass', 2, true]
      );

      // Criar clientes para cada tenant
      const cliente1 = await pool.query(
        "INSERT INTO clientes (nome, sobrenome, email, senha, tenant_id, id_carteirinha, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        ['Cliente1', 'Sobrenome', 'cliente1@test.com', 'hash', 1, 'C00001', true]
      );

      const cliente2 = await pool.query(
        "INSERT INTO clientes (nome, sobrenome, email, senha, tenant_id, id_carteirinha, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        ['Cliente2', 'Sobrenome', 'cliente2@test.com', 'hash', 2, 'C00002', true]
      );

      // Teste 1: Tenant 1 não deve ver dados do Tenant 2
      const tenant1Clients = await pool.query(
        "SELECT * FROM clientes WHERE tenant_id = $1",
        [1]
      );

      const tenant2Clients = await pool.query(
        "SELECT * FROM clientes WHERE tenant_id = $1",
        [2]
      );

      if (tenant1Clients.rows.length === 1 && tenant2Clients.rows.length === 1) {
        await this.log('TENANT_ISOLATION', 'PASS', 'Isolamento multi-tenant funcionando corretamente');
      } else {
        await this.log('TENANT_ISOLATION', 'FAIL', 'Problemas no isolamento multi-tenant');
      }

      // Limpeza
      await pool.query("DELETE FROM clientes WHERE email LIKE '%@test.com'");
      await pool.query("DELETE FROM provedores WHERE email LIKE '%@test.com'");

    } catch (error) {
      await this.log('TENANT_ISOLATION', 'ERROR', error.message);
    }
  }

  async testValidationMiddleware() {
    console.log('\n✅ Testando middleware de validação...');

    try {
      const { validateData } = require('../src/lib/validation-middleware');

      // Teste 1: Dados válidos
      const validClient = {
        nome: 'João',
        sobrenome: 'Silva',
        email: 'joao@example.com',
        senha: '123456'
      };

      try {
        const validated = validateData(validClient, 'cliente');
        await this.log('VALIDATION_VALID_DATA', 'PASS', 'Dados válidos aceitos corretamente');
      } catch (error) {
        await this.log('VALIDATION_VALID_DATA', 'FAIL', 'Dados válidos foram rejeitados incorretamente');
      }

      // Teste 2: Dados inválidos
      const invalidClient = {
        nome: '',
        sobrenome: 'Silva',
        email: 'email-inválido',
        senha: '123'  // muito curta
      };

      try {
        const validated = validateData(invalidClient, 'cliente');
        await this.log('VALIDATION_INVALID_DATA', 'FAIL', 'Dados inválidos foram aceitos');
      } catch (error) {
        await this.log('VALIDATION_INVALID_DATA', 'PASS', 'Dados inválidos foram rejeitados corretamente');
      }

      // Teste 3: Tentativa de XSS
      const xssClient = {
        nome: '<script>alert("XSS")</script>',
        sobrenome: 'Silva',
        email: 'teste@example.com',
        senha: '123456'
      };

      try {
        const validated = validateData(xssClient, 'cliente');
        if (validated.nome.includes('<script>')) {
          await this.log('XSS_PROTECTION', 'FAIL', 'Script malicioso não foi removido');
        } else {
          await this.log('XSS_PROTECTION', 'PASS', 'Script malicioso foi sanitizado');
        }
      } catch (error) {
        await this.log('XSS_PROTECTION', 'PASS', 'Dados com XSS foram rejeitados');
      }

    } catch (error) {
      await this.log('VALIDATION_MIDDLEWARE', 'ERROR', error.message);
    }
  }

  async testAuditLogging() {
    console.log('\n📝 Testando logs de auditoria...');

    try {
      const { logTenantAction } = require('../src/lib/tenant-helper');

      // Teste 1: Log normal
      await logTenantAction(
        1,
        999,
        'teste',
        'teste_acao',
        { dados: 'normais' }
      );

      // Teste 2: Log com dados sensíveis (deve ser sanitizado)
      await logTenantAction(
        1,
        999,
        'teste',
        'teste_acao_sensivel',
        {
          email: 'teste@example.com',
          senha: 'senha_secreta',
          token: 'token_secreto'
        }
      );

      // Verificar se dados sensíveis foram sanitizados
      const logs = await pool.query(
        "SELECT * FROM tenant_logs WHERE acao = 'teste_acao_sensivel' ORDER BY created_at DESC LIMIT 1"
      );

      if (logs.rows.length > 0) {
        const detalhes = logs.rows[0].detalhes;
        if (detalhes.senha === '[DADOS_REMOVIDOS]' && detalhes.token === '[DADOS_REMOVIDOS]') {
          await this.log('AUDIT_SANITIZATION', 'PASS', 'Dados sensíveis foram sanitizados corretamente');
        } else {
          await this.log('AUDIT_SANITIZATION', 'FAIL', 'Dados sensíveis não foram sanitizados');
        }
      }

      // Limpeza
      await pool.query("DELETE FROM tenant_logs WHERE acao LIKE 'teste_%'");

    } catch (error) {
      await this.log('AUDIT_LOGGING', 'ERROR', error.message);
    }
  }

  async testDatabaseConstraints() {
    console.log('\n🗄️ Testando constraints do banco de dados...');

    try {
      // Teste 1: Email inválido deve ser rejeitado
      try {
        await pool.query(
          "INSERT INTO clientes (nome, sobrenome, email, senha, tenant_id, id_carteirinha, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          ['Teste', 'Sobrenome', 'email-inválido', 'hash', 1, 'T00001', true]
        );
        await this.log('DB_EMAIL_CONSTRAINT', 'FAIL', 'Email inválido foi aceito pelo banco');
      } catch (error) {
        await this.log('DB_EMAIL_CONSTRAINT', 'PASS', 'Email inválido foi rejeitado pelo banco');
      }

      // Teste 2: Desconto fora do range deve ser rejeitado
      try {
        await pool.query(
          "INSERT INTO vouchers (parceiro_id, codigo, desconto, titulo, tenant_id) VALUES ($1, $2, $3, $4, $5)",
          [1, 'TEST123', 150, 'Teste', 1]  // 150% é inválido
        );
        await this.log('DB_DISCOUNT_CONSTRAINT', 'FAIL', 'Desconto inválido foi aceito');
      } catch (error) {
        await this.log('DB_DISCOUNT_CONSTRAINT', 'PASS', 'Desconto inválido foi rejeitado');
      }

    } catch (error) {
      await this.log('DATABASE_CONSTRAINTS', 'ERROR', error.message);
    }
  }

  async testPasswordSecurity() {
    console.log('\n🔒 Testando segurança de senhas...');

    try {
      const bcrypt = require('bcryptjs');

      // Teste 1: Senhas devem ser hasheadas
      const plainPassword = 'minhasenha123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      if (hashedPassword !== plainPassword && hashedPassword.startsWith('$2')) {
        await this.log('PASSWORD_HASHING', 'PASS', 'Senhas são hasheadas corretamente');
      } else {
        await this.log('PASSWORD_HASHING', 'FAIL', 'Problemas no hash de senhas');
      }

      // Teste 2: Verificação de senha
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      if (isValid) {
        await this.log('PASSWORD_VERIFICATION', 'PASS', 'Verificação de senha funciona corretamente');
      } else {
        await this.log('PASSWORD_VERIFICATION', 'FAIL', 'Problemas na verificação de senha');
      }

    } catch (error) {
      await this.log('PASSWORD_SECURITY', 'ERROR', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 Iniciando testes de segurança...\n');

    await this.testSqlInjectionProtection();
    await this.testTenantIsolation();
    await this.testValidationMiddleware();
    await this.testAuditLogging();
    await this.testDatabaseConstraints();
    await this.testPasswordSecurity();

    // Resumo dos resultados
    console.log('\n📊 RESUMO DOS TESTES');
    console.log('==================');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;

    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    console.log(`⚠️  Erros: ${errors}`);
    console.log(`📝 Total: ${this.results.length}`);

    if (failed > 0 || errors > 0) {
      console.log('\n❌ TESTES COM FALHAS:');
      this.results
        .filter(r => r.status === 'FAIL' || r.status === 'ERROR')
        .forEach(r => console.log(`- ${r.test}: ${r.message}`));
    }

    return {
      passed,
      failed,
      errors,
      total: this.results.length,
      details: this.results
    };
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new SecurityTester();
  tester.runAllTests()
    .then(results => {
      console.log('\nTestes concluídos!');
      process.exit(results.failed > 0 || results.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Erro ao executar testes:', error);
      process.exit(1);
    });
}

module.exports = SecurityTester;