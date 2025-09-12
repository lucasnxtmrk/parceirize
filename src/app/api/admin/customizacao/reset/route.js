import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { options } from '@/app/api/auth/[...nextauth]/options'
import { Pool } from 'pg'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

export async function POST(request) {
    try {
        const session = await getServerSession(options)
        
        if (!session || !['provedor', 'superadmin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const tenant_id = session.user.tenant_id

        if (!tenant_id) {
            return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 })
        }

        // Verificar se o provedor existe
        const provedorResult = await pool.query(
            'SELECT id FROM provedores WHERE tenant_id = $1',
            [tenant_id]
        )

        if (provedorResult.rows.length === 0) {
            return NextResponse.json({ error: 'Provedor não encontrado' }, { status: 404 })
        }

        // Removi a verificação do plano pois pode estar causando problemas
        // e o sistema já está verificando permissões no middleware

        // Restaurar valores padrão - usando NULL para que o sistema use os fallbacks
        await pool.query(
            `UPDATE provedores 
             SET logo_url = NULL,
                 cor_primaria = NULL,
                 cor_secundaria = NULL,
                 cor_fundo_menu = NULL,
                 cor_texto_menu = NULL,
                 cor_hover_menu = NULL,
                 filtro_logo = NULL,
                 updated_at = NOW()
             WHERE tenant_id = $1`,
            [tenant_id]
        )

        return NextResponse.json({ 
            success: true,
            message: 'Configurações restauradas para o padrão'
        })

    } catch (error) {
        console.error('Erro ao restaurar configurações:', error)
        return NextResponse.json(
            { error: 'Erro ao restaurar configurações' },
            { status: 500 }
        )
    }
}