"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Row, Col, Card, CardTitle, CardBody } from 'react-bootstrap';
import { 
    FaUsers, FaMoneyBillWave, FaShoppingBag, FaTicketAlt, 
    FaChartLine, FaPercentage, FaUserFriends, FaClock,
    FaPlus, FaFileExport, FaEye, FaTrophy
} from 'react-icons/fa';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { CardLoading } from '@/components/ui/Loading';
import Button from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import {
    DailySalesChart,
    HourlySalesChart,
    TopProductsBarChart,
    MonthlyGoalGauge,
    ParceiroKPICard
} from './components/ParceiroModernCharts';

const DashboardPage = () => {
    const { data: session, status } = useSession();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const toast = useToast();
    const router = useRouter();

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Só faz a requisição se o usuário estiver logado e for parceiro
            if (status !== 'authenticated' || !session?.user || session.user.role !== 'parceiro') {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await fetch('/api/parceiro/dashboard-complete');
                if (!response.ok) {
                    throw new Error(`Erro ao buscar dados: ${response.status}`);
                }
                const data = await response.json();
                setDashboardData(data);
            } catch (err) {
                console.error("❌ Erro na requisição:", err);
                setError(err.message);
                toast.error('Erro ao Carregar', 'Não foi possível carregar os dados do dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [session, status]);

    // Loading da sessão
    if (status === 'loading' || loading) {
        return (
            <ComponentContainerCard id="parceiro-dashboard">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <CardTitle as="h4" className="mb-0">🚀 Painel do Parceiro</CardTitle>
                </div>
                <CardLoading count={8} />
            </ComponentContainerCard>
        );
    }

    // Se não estiver autenticado ou não for parceiro
    if (status !== 'authenticated' || !session?.user || session.user.role !== 'parceiro') {
        return (
            <ComponentContainerCard id="parceiro-dashboard">
                <div className="text-center py-5">
                    <h5 className="text-danger mb-3">Acesso Negado</h5>
                    <p className="text-muted">Você precisa estar logado como parceiro para acessar esta página.</p>
                    <Button variant="primary" onClick={() => router.push('/auth/login')}>
                        Fazer Login
                    </Button>
                </div>
            </ComponentContainerCard>
        );
    }

    if (error) {
        return (
            <ComponentContainerCard id="parceiro-dashboard">
                <div className="text-center py-5">
                    <h5 className="text-danger mb-3">Erro ao carregar dashboard</h5>
                    <p className="text-muted">{error}</p>
                    <Button variant="primary" onClick={() => window.location.reload()}>
                        Tentar Novamente
                    </Button>
                </div>
            </ComponentContainerCard>
        );
    }

    // Se não há dados ainda, não renderiza o conteúdo
    if (!dashboardData) {
        return (
            <ComponentContainerCard id="parceiro-dashboard">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <CardTitle as="h4" className="mb-0">🚀 Painel do Parceiro</CardTitle>
                </div>
                <CardLoading count={8} />
            </ComponentContainerCard>
        );
    }

    const { stats, kpis, vendasDiarias, topProdutos, vendasHorario } = dashboardData;

    // Handlers para os botões
    const handleNewProduct = () => {
        toast.info('Redirecionando', 'Abrindo página de produtos...');
        router.push('/produtos');
    };

    const handleCreateVoucher = () => {
        toast.info('Redirecionando', 'Abrindo página de vouchers...');
        router.push('/voucher');
    };

    const handleViewHistory = () => {
        toast.info('Redirecionando', 'Abrindo histórico completo...');
        router.push('/historico');
    };

    const handleExportReport = () => {
        toast.info('Em desenvolvimento', 'Funcionalidade de exportação será implementada em breve');
    };

    return (
        <ComponentContainerCard id="parceiro-dashboard">
            {/* Cabeçalho Modern */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                <div>
                    <CardTitle as="h4" className="mb-1">🚀 Painel do Parceiro</CardTitle>
                    <p className="text-muted small mb-0">Acompanhe o desempenho do seu negócio em tempo real</p>
                </div>
                
                {/* Ações rápidas */}
                <div className="d-flex gap-2 flex-wrap">
                    <Button 
                        size="sm" 
                        variant="primary" 
                        icon={FaPlus} 
                        onClick={handleNewProduct}
                    >
                        Produto
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline-success" 
                        icon={FaTicketAlt} 
                        onClick={handleCreateVoucher}
                    >
                        Cupom
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline-secondary" 
                        icon={FaEye} 
                        onClick={handleViewHistory}
                    >
                        Histórico
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline-secondary" 
                        icon={FaFileExport} 
                        onClick={handleExportReport}
                    >
                        Exportar
                    </Button>
                </div>
            </div>

            {/* KPIs Principais */}
            <div className="mb-4">
                <Row className="g-3">
                    <Col xl={3} lg={6} md={6}>
                        <ParceiroKPICard
                            title="Receita Total"
                            value={stats?.receitaTotal || 0}
                            subtitle={`${stats?.totalVendas || 0} vendas realizadas`}
                            icon={FaMoneyBillWave}
                            color="#10b981"
                            prefix="R$"
                        />
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <ParceiroKPICard
                            title="Receita do Mês"
                            value={stats?.receitaMes || 0}
                            subtitle={`${stats?.vendasMes || 0} vendas este mês`}
                            icon={FaChartLine}
                            color="#3b82f6"
                            prefix="R$"
                        />
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <ParceiroKPICard
                            title="Receita Hoje"
                            value={stats?.receitaHoje || 0}
                            subtitle="Vendas do dia atual"
                            icon={FaClock}
                            color="#f59e0b"
                            prefix="R$"
                        />
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <ParceiroKPICard
                            title="Clientes Únicos"
                            value={stats?.clientesUnicos || 0}
                            subtitle="Base de clientes ativa"
                            icon={FaUsers}
                            color="#8b5cf6"
                        />
                    </Col>
                </Row>
            </div>

            {/* KPIs de Performance */}
            <div className="mb-4">
                <Row className="g-3">
                    <Col xl={4} lg={4} md={6}>
                        <ParceiroKPICard
                            title="Ticket Médio"
                            value={kpis?.ticketMedio || 0}
                            subtitle="Valor médio por venda"
                            icon={FaMoneyBillWave}
                            color="#06b6d4"
                            prefix="R$"
                        />
                    </Col>
                    <Col xl={4} lg={4} md={6}>
                        <ParceiroKPICard
                            title="Taxa Conversão Vouchers"
                            value={kpis?.taxaConversaoVouchers || 0}
                            subtitle="Vouchers utilizados vs total"
                            icon={FaPercentage}
                            color="#ef4444"
                            suffix="%"
                        />
                    </Col>
                    <Col xl={4} lg={4} md={6}>
                        <ParceiroKPICard
                            title="Receita por Cliente"
                            value={kpis?.receitaPorCliente || 0}
                            subtitle="Valor médio por cliente"
                            icon={FaUserFriends}
                            color="#84cc16"
                            prefix="R$"
                        />
                    </Col>
                </Row>
            </div>

            {/* Produtos e Vouchers */}
            <div className="mb-4">
                <Row className="g-3">
                    <Col xl={3} lg={6} md={6}>
                        <ParceiroKPICard
                            title="Produtos Ativos"
                            value={stats?.produtosAtivos || 0}
                            subtitle={`${stats?.totalProdutos || 0} produtos cadastrados`}
                            icon={FaShoppingBag}
                            color="#f97316"
                        />
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <ParceiroKPICard
                            title="Vouchers Ativos"
                            value={stats?.vouchersAtivos || 0}
                            subtitle={`${stats?.vouchersUtilizados || 0} já utilizados`}
                            icon={FaTicketAlt}
                            color="#a855f7"
                        />
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <MonthlyGoalGauge 
                            current={stats?.receitaMes || 0} 
                            target={stats?.metaMensal || 1000} 
                        />
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <Card className="h-100 border-0 shadow-sm bg-gradient" 
                              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                            <CardBody className="text-white text-center d-flex flex-column justify-content-center">
                                <FaTrophy size={36} className="mb-3 mx-auto" style={{ color: '#fbbf24' }} />
                                <h5 className="mb-2">🏆 Destaque</h5>
                                <p className="small mb-0">
                                    {topProdutos && topProdutos.length > 0 ? (
                                        <>Produto top: <strong>{topProdutos[0].nome.substring(0, 15)}...</strong></>
                                    ) : (
                                        <>Cadastre produtos para começar!</>
                                    )}
                                </p>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Gráficos de Análise */}
            <div className="mb-4">
                <Row className="g-4">
                    <Col lg={8}>
                        <DailySalesChart data={vendasDiarias} />
                    </Col>
                    <Col lg={4}>
                        <TopProductsBarChart data={topProdutos} />
                    </Col>
                </Row>
            </div>

            {/* Análise Detalhada */}
            <div className="mb-4">
                <Row className="g-4">
                    <Col lg={12}>
                        <HourlySalesChart data={vendasHorario} />
                    </Col>
                </Row>
            </div>
        </ComponentContainerCard>
    );
};

export default DashboardPage;