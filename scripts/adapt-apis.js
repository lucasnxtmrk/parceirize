const fs = require('fs');
const path = require('path');

/**
 * Script para identificar e listar APIs que precisam ser adaptadas para multi-tenant
 */

function findApiFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findApiFiles(filePath, fileList);
    } else if (file === 'route.js' || file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function analyzeApiFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se já foi adaptado
    const isAdapted = content.includes('withTenantIsolation') || content.includes('tenant_id');
    
    // Verificar se é uma API protegida
    const hasAuth = content.includes('getServerSession') || content.includes('session');
    
    // Verificar se faz queries no banco
    const hasDbQueries = content.includes('pool.query') || content.includes('FROM clientes') || content.includes('FROM parceiros');
    
    // Verificar se é uma API crítica que precisa de isolamento
    const needsIsolation = hasDbQueries && 
                          (content.includes('FROM clientes') || 
                           content.includes('FROM parceiros') ||
                           content.includes('FROM produtos') ||
                           content.includes('FROM pedidos') ||
                           content.includes('FROM vouchers'));
    
    return {
      path: filePath,
      isAdapted,
      hasAuth,
      hasDbQueries,
      needsIsolation,
      priority: needsIsolation && !isAdapted ? 'HIGH' : 
               hasDbQueries && !isAdapted ? 'MEDIUM' : 'LOW'
    };
  } catch (error) {
    return {
      path: filePath,
      error: error.message,
      priority: 'ERROR'
    };
  }
}

// Executar análise
console.log('🔍 Analisando APIs do projeto...\n');

const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
const apiFiles = findApiFiles(apiDir);

console.log(`📁 Encontradas ${apiFiles.length} APIs\n`);

const analysis = apiFiles.map(analyzeApiFile);

// Separar por prioridade
const highPriority = analysis.filter(a => a.priority === 'HIGH');
const mediumPriority = analysis.filter(a => a.priority === 'MEDIUM');
const lowPriority = analysis.filter(a => a.priority === 'LOW');
const adapted = analysis.filter(a => a.isAdapted);
const errors = analysis.filter(a => a.priority === 'ERROR');

console.log('🔴 ALTA PRIORIDADE - APIs que precisam ser adaptadas URGENTE:');
console.log(`(${highPriority.length} APIs)\n`);
highPriority.forEach(api => {
  console.log(`  ❌ ${api.path.replace(process.cwd(), '')}`);
});

console.log('\n🟡 MÉDIA PRIORIDADE - APIs com queries mas menos críticas:');
console.log(`(${mediumPriority.length} APIs)\n`);
mediumPriority.forEach(api => {
  console.log(`  ⚠️  ${api.path.replace(process.cwd(), '')}`);
});

console.log('\n✅ JÁ ADAPTADAS - APIs que já têm isolamento:');
console.log(`(${adapted.length} APIs)\n`);
adapted.forEach(api => {
  console.log(`  ✅ ${api.path.replace(process.cwd(), '')}`);
});

console.log('\n🔵 BAIXA PRIORIDADE - APIs que não precisam de adaptação:');
console.log(`(${lowPriority.length} APIs)\n`);

if (errors.length > 0) {
  console.log('\n❌ ERROS - APIs com problemas de leitura:');
  console.log(`(${errors.length} APIs)\n`);
  errors.forEach(api => {
    console.log(`  ❌ ${api.path.replace(process.cwd(), '')}: ${api.error}`);
  });
}

// Resumo final
console.log('\n📊 RESUMO DA ANÁLISE:');
console.log(`🔴 URGENTE: ${highPriority.length} APIs`);
console.log(`🟡 MÉDIO: ${mediumPriority.length} APIs`);
console.log(`✅ ADAPTADAS: ${adapted.length} APIs`);
console.log(`🔵 BAIXA: ${lowPriority.length} APIs`);
console.log(`❌ ERROS: ${errors.length} APIs`);
console.log(`📁 TOTAL: ${apiFiles.length} APIs`);

console.log('\n💡 PRÓXIMOS PASSOS:');
console.log('1. Adaptar as APIs de ALTA PRIORIDADE primeiro');
console.log('2. Testar cada API após adaptação');
console.log('3. Adaptar as APIs de MÉDIA PRIORIDADE');
console.log('4. Verificar se há algum erro nas APIs');

// Salvar relatório em arquivo
const reportPath = path.join(process.cwd(), 'RELATORIO_APIS.md');
let report = '# Relatório de Adaptação de APIs Multi-Tenant\n\n';
report += `**Data:** ${new Date().toLocaleString('pt-BR')}\n\n`;
report += `**Total de APIs:** ${apiFiles.length}\n\n`;

report += '## 🔴 Alta Prioridade (Urgente)\n\n';
highPriority.forEach(api => {
  report += `- [ ] ${api.path.replace(process.cwd(), '')}\n`;
});

report += '\n## 🟡 Média Prioridade\n\n';
mediumPriority.forEach(api => {
  report += `- [ ] ${api.path.replace(process.cwd(), '')}\n`;
});

report += '\n## ✅ Já Adaptadas\n\n';
adapted.forEach(api => {
  report += `- [x] ${api.path.replace(process.cwd(), '')}\n`;
});

fs.writeFileSync(reportPath, report);
console.log(`\n📄 Relatório salvo em: ${reportPath}`);