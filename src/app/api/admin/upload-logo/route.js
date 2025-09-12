import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getServerSession } from 'next-auth';
import { options } from "@/app/api/auth/[...nextauth]/options";

export async function POST(request) {
  try {
    const session = await getServerSession(options);
    
    if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('logo');

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validações específicas para logo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Formato não suportado. Use PNG, JPG ou SVG.' 
      }, { status: 400 });
    }

    // Validar tamanho do arquivo (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Arquivo muito grande. Máximo 2MB.' 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Criar nome único para o arquivo
    const timestamp = Date.now();
    const tenantId = session.user.tenant_id;
    const originalExtension = path.extname(file.name);
    const fileName = `logo-${tenantId}-${timestamp}${originalExtension}`;

    // Definir pasta de uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    
    // Criar pasta se não existir
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Pasta já existe ou erro ao criar
    }

    // Salvar arquivo
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // URL pública do arquivo
    const logoUrl = `/uploads/logos/${fileName}`;

    console.log(`✅ Logo enviada com sucesso: ${logoUrl}`);

    return NextResponse.json({
      success: true,
      logo_url: logoUrl,
      message: 'Logo enviada com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro no upload da logo:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}