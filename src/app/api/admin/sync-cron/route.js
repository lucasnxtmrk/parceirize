import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { options } from '@/app/api/auth/[...nextauth]/options';
import { getPersistentCronService } from '@/lib/persistent-cron-service';
import { ensureCronInitialized } from '@/lib/cron-initializer';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });


// GET: Status do cron persistente
export async function GET() {
  const session = await getServerSession(options);
  if (!session || !['superadmin', 'provedor'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  try {
    // Garantir que o cron esteja inicializado
    ensureCronInitialized();

    const cronService = getPersistentCronService();
    const status = await cronService.getCronJobsStatus();

    return new Response(JSON.stringify({
      success: true,
      versao: 'persistente',
      cron_jobs: status,
      sistema_ativo: true
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Erro ao obter status do cron persistente',
      details: error.message
    }), { status: 500 });
  }
}

// POST: Controlar cron persistente
export async function POST(req) {
  const session = await getServerSession(options);
  if (!session || !['superadmin', 'provedor'].includes(session.user.role)) {
    return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403 });
  }

  try {
    const { action, job_name = 'sgp_sync_inteligente', intervalo_horas } = await req.json();

    // Garantir que o cron esteja inicializado
    ensureCronInitialized();

    const cronService = getPersistentCronService();

    switch (action) {
      case 'enable':
        const jobEnabled = await cronService.toggleCronJob(job_name, true);
        console.log(`✅ Cron job ativado pelo usuário: ${session.user.email}`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Cron job ativado no sistema persistente - executa automaticamente',
          job: jobEnabled
        }), { status: 200 });

      case 'disable':
        const jobDisabled = await cronService.toggleCronJob(job_name, false);
        console.log(`🛑 Cron job desativado pelo usuário: ${session.user.email}`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Cron job desativado no sistema persistente',
          job: jobDisabled
        }), { status: 200 });

      case 'run_now':
        console.log(`🏃‍♂️ Executando ${job_name} manualmente pelo usuário: ${session.user.email}`);
        const resultado = await cronService.runCronJobNow(job_name);
        return new Response(JSON.stringify({
          success: true,
          message: 'Sincronização executada manualmente no sistema persistente',
          resultado
        }), { status: 200 });

      case 'update_interval':
        if (!intervalo_horas || intervalo_horas < 1) {
          return new Response(JSON.stringify({
            error: 'Intervalo inválido. Deve ser pelo menos 1 hora'
          }), { status: 400 });
        }
        const jobUpdated = await cronService.updateCronInterval(job_name, intervalo_horas);
        return new Response(JSON.stringify({
          success: true,
          message: `Intervalo atualizado para ${intervalo_horas} horas`,
          job: jobUpdated
        }), { status: 200 });

      case 'reset':
        const jobReset = await cronService.resetCronJob(job_name);
        return new Response(JSON.stringify({
          success: true,
          message: 'Cron job resetado com sucesso',
          job: jobReset
        }), { status: 200 });

      case 'status':
        const status = await cronService.getCronJobsStatus();
        return new Response(JSON.stringify({
          success: true,
          cron_jobs: status
        }), { status: 200 });

      case 'history':
        const history = await cronService.getCronJobHistory(job_name, 20);
        return new Response(JSON.stringify({
          success: true,
          history
        }), { status: 200 });

      default:
        return new Response(JSON.stringify({
          error: 'Ação inválida',
          acoes_disponiveis: ['enable', 'disable', 'run_now', 'update_interval', 'reset', 'status', 'history']
        }), { status: 400 });
    }

  } catch (error) {
    console.error('❌ Erro ao controlar cron persistente:', error.message);
    return new Response(JSON.stringify({
      error: 'Erro ao controlar cron persistente',
      details: error.message
    }), { status: 500 });
  }
}