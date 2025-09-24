// Script para testar a edição de provedores via API

async function testProvedorEdit() {
  try {
    console.log('🧪 Testando edição de provedor via API...\n');

    // Primeiro, listar provedores para pegar um ID válido
    const listResponse = await fetch('http://localhost:3000/api/superadmin/provedores', {
      headers: {
        'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN_HERE' // Substitua pelo token real
      }
    });

    if (!listResponse.ok) {
      console.log('❌ Erro ao listar provedores - precisa estar logado como superadmin');
      console.log('📋 Para testar manualmente:');
      console.log('1. Faça login como superadmin no sistema');
      console.log('2. Abra as ferramentas de desenvolvedor (F12)');
      console.log('3. Vá para Network → Headers → Cookie');
      console.log('4. Copie o next-auth.session-token');
      console.log('5. Execute este script com o token correto');
      return;
    }

    const proveedores = await listResponse.json();
    console.log(`📋 Encontrados ${proveedores.data?.length || 0} provedores`);

    if (!proveedores.data || proveedores.data.length === 0) {
      console.log('❌ Nenhum provedor encontrado para testar');
      return;
    }

    const provedor = proveedores.data[0];
    console.log(`🎯 Testando com provedor ID: ${provedor.id}`);
    console.log(`   Nome atual: ${provedor.nome_empresa}`);
    console.log(`   Email atual: ${provedor.email}`);

    // Dados de teste para atualização
    const updateData = {
      nome_empresa: provedor.nome_empresa + ' (Editado)',
      email: 'teste-' + Math.random().toString(36).substr(2, 5) + '@exemplo.com',
      ativo: provedor.ativo
    };

    console.log('\n🔄 Tentando atualizar provedor...');
    console.log('Novos dados:', updateData);

    const updateResponse = await fetch(`http://localhost:3000/api/superadmin/provedores/${provedor.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=YOUR_SESSION_TOKEN_HERE' // Substitua pelo token real
      },
      body: JSON.stringify(updateData)
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ Provedor atualizado com sucesso!');
      console.log('📄 Resultado:', result);
    } else {
      const error = await updateResponse.json();
      console.log('❌ Erro na atualização:');
      console.log(`Status: ${updateResponse.status}`);
      console.log('Detalhes:', error);

      if (error.error?.includes('Este email já está sendo usado')) {
        console.log('💡 Email duplicado detectado - validação funcionando!');
      }
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Para uso manual
console.log('📋 Para testar completamente:');
console.log('1. Faça login como superadmin no sistema');
console.log('2. Acesse /superadmin/provedores');
console.log('3. Clique em "Editar" em qualquer provedor');
console.log('4. Tente alterar o Nome da Empresa e Email');
console.log('5. Clique em "Salvar Alterações"');
console.log('');
console.log('✅ Se funcionou corretamente:');
console.log('   - Campos não estão mais disabled');
console.log('   - Pode digitar nos campos');
console.log('   - Salva sem erro');
console.log('   - Dados são atualizados no banco');

// testProvedorEdit(); // Descomente para executar