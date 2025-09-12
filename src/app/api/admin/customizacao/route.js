import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { withTenantIsolation } from "@/lib/tenant-helper";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const GET = withTenantIsolation(async (request, { tenant }) => {
  try {
    console.log("📝 Buscando configurações de customização para tenant:", tenant.tenant_id);

    // Verificar se o provedor tem plano Enterprise (ID: 3)
    const planQuery = `
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

    const result = await pool.query(planQuery, [tenant.tenant_id]);

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provedor não encontrado" }), 
        { status: 404 }
      );
    }

    const providerData = result.rows[0];
    
    // Verificar se tem plano Enterprise (ID: 3)
    if (providerData.plano_id !== 3) {
      return new Response(JSON.stringify({
        error: "Customização visual disponível apenas para plano Enterprise",
        plano_atual: providerData.plano_nome || "Não definido",
        customization_available: false
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      logo_url: providerData.logo_url || null,
      cor_primaria: providerData.cor_primaria || null,
      cor_secundaria: providerData.cor_secundaria || null,
      cor_fundo_menu: providerData.cor_fundo_menu || null,
      cor_texto_menu: providerData.cor_texto_menu || null,
      cor_hover_menu: providerData.cor_hover_menu || null,
      filtro_logo: providerData.filtro_logo || null,
      plano_atual: providerData.plano_nome,
      customization_available: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao buscar customização:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao buscar configurações de customização" }), 
      { status: 500 }
    );
  }
});

export const PUT = withTenantIsolation(async (request, { tenant }) => {
  try {
    const body = await request.json();
    const { logo_url, cor_primaria, cor_secundaria, cor_fundo_menu, cor_texto_menu, cor_hover_menu, filtro_logo } = body;

    console.log("💾 Salvando customização para tenant:", tenant.tenant_id);

    // Primeiro, verificar se o provedor tem plano Enterprise
    const planCheck = await pool.query(`
      SELECT plano_id, pl.nome as plano_nome 
      FROM provedores p
      LEFT JOIN planos pl ON p.plano_id = pl.id
      WHERE p.tenant_id = $1
    `, [tenant.tenant_id]);

    if (planCheck.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provedor não encontrado" }), 
        { status: 404 }
      );
    }

    if (planCheck.rows[0].plano_id !== 3) {
      return new Response(JSON.stringify({
        error: "Customização visual disponível apenas para plano Enterprise",
        plano_atual: planCheck.rows[0].plano_nome || "Não definido"
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validação básica das cores (formato hex)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (cor_primaria && !hexColorRegex.test(cor_primaria)) {
      return new Response(
        JSON.stringify({ error: "Cor primária deve estar no formato hexadecimal (#000000)" }), 
        { status: 400 }
      );
    }
    
    if (cor_secundaria && !hexColorRegex.test(cor_secundaria)) {
      return new Response(
        JSON.stringify({ error: "Cor secundária deve estar no formato hexadecimal (#000000)" }), 
        { status: 400 }
      );
    }

    if (cor_fundo_menu && !hexColorRegex.test(cor_fundo_menu)) {
      return new Response(
        JSON.stringify({ error: "Cor de fundo do menu deve estar no formato hexadecimal (#000000)" }), 
        { status: 400 }
      );
    }

    if (cor_texto_menu && !hexColorRegex.test(cor_texto_menu)) {
      return new Response(
        JSON.stringify({ error: "Cor do texto do menu deve estar no formato hexadecimal (#000000)" }), 
        { status: 400 }
      );
    }

    if (cor_hover_menu && !hexColorRegex.test(cor_hover_menu)) {
      return new Response(
        JSON.stringify({ error: "Cor de hover do menu deve estar no formato hexadecimal (#000000)" }), 
        { status: 400 }
      );
    }

    const query = `
      UPDATE provedores 
      SET 
        logo_url = $1,
        cor_primaria = $2,
        cor_secundaria = $3,
        cor_fundo_menu = $4,
        cor_texto_menu = $5,
        cor_hover_menu = $6,
        filtro_logo = $7
      WHERE tenant_id = $8
      RETURNING logo_url, cor_primaria, cor_secundaria, cor_fundo_menu, cor_texto_menu, cor_hover_menu, filtro_logo
    `;

    const result = await pool.query(query, [
      logo_url || null,
      cor_primaria || '#0d6efd',
      cor_secundaria || '#6c757d',
      cor_fundo_menu || '#f8f9fa',
      cor_texto_menu || '#495057',
      cor_hover_menu || null,
      filtro_logo || 'none',
      tenant.tenant_id
    ]);

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provedor não encontrado" }), 
        { status: 404 }
      );
    }

    console.log("✅ Customização salva com sucesso");

    return new Response(JSON.stringify({
      message: "Customização salva com sucesso",
      data: result.rows[0]
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro ao salvar customização:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao salvar configurações de customização" }), 
      { status: 500 }
    );
  }
});