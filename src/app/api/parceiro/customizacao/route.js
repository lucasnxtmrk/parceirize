import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("🎨 Parceiro buscando customização do provedor:", tenant.tenant_id);

    // Buscar customização do provedor (dono do tenant)
    const query = `
      SELECT 
        p.logo_url,
        p.cor_primaria,
        p.cor_secundaria,
        p.cor_fundo_menu,
        p.cor_texto_menu,
        p.cor_hover_menu,
        p.filtro_logo,
        pl.nome as plano_nome,
        p.plano_id
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE p.tenant_id = $1
    `;

    const result = await pool.query(query, [tenant.tenant_id]);

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Provedor não encontrado",
          customization_available: false 
        }), 
        { status: 404 }
      );
    }

    const providerData = result.rows[0];
    
    // Removida verificação de plano - deixar o provedor decidir se quer customizar
    // A limitação de plano deve ser feita apenas na API de admin ao salvar

    return new Response(JSON.stringify({
      logo_url: providerData.logo_url || null,
      cor_primaria: providerData.cor_primaria || null,
      cor_secundaria: providerData.cor_secundaria || null,
      cor_fundo_menu: providerData.cor_fundo_menu || null,
      cor_texto_menu: providerData.cor_texto_menu || null,
      cor_hover_menu: providerData.cor_hover_menu || null,
      filtro_logo: providerData.filtro_logo || null,
      plano_provedor: providerData.plano_nome,
      customization_available: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar customização para parceiro:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro ao buscar configurações de customização",
        customization_available: false 
      }), 
      { status: 500 }
    );
  }
});