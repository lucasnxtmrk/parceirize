"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Row, Col, Card, CardTitle, Badge } from 'react-bootstrap';
import { 
    FaUsers, FaPercentage, FaShoppingBag, FaChartLine, 
    FaMoneyBillWave, FaTicketAlt, FaTrophy, FaCalendarCheck,
    FaArrowUp, FaArrowDown, FaPlus, FaFileExport
} from 'react-icons/fa';
import DashboardCard from './components/DashboardCard';
import ChartCard from './components/ChartCard';
import RecentSales from './components/RecentSales';
import TopProducts from './components/TopProducts';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { CardLoading } from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

const DashboardReportPage = () => {
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
                const response = await fetch('/api/parceiro/dashboard');
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
    }, [session, status]); // Depende da sessão para evitar requisições desnecessárias

    // Loading da sessão
    if (status === 'loading' || loading) {
        return (
            <ComponentContainerCard id="parceiro-dashboard">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <CardTitle as="h4" className="mb-0">Dashboard - Relatórios & Vendas</CardTitle>
                </div>
                <CardLoading count={4} />
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
                    <CardTitle as="h4" className="mb-0">Dashboard - Relatórios & Vendas</CardTitle>
                </div>
                <CardLoading count={4} />
            </ComponentContainerCard>
        );
    }

    const { stats, recentSales, topProducts, chartData } = dashboardData;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // Handlers para os botões
    const handleNewProduct = () => {
        toast.info('Redirecionando', 'Abrindo página de produtos...');
        router.push('/produtos');
    };

    const handleCreateVoucher = () => {
        toast.info('Redirecionando', 'Abrindo página de vouchers...');
        router.push('/voucher');
    };

    const handleExportReport = () => {
        toast.info('Em desenvolvimento', 'Funcionalidade de exportação será implementada em breve');
    };

    return (
        <ComponentContainerCard id="parceiro-dashboard">
            {/* Cabeçalho Clean */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                <div>
                    <CardTitle as="h4" className="mb-1">Relatórios & Vendas</CardTitle>
                    <p className="text-muted small mb-0">Visão geral do seu desempenho comercial</p>
                </div>
                
                {/* Ações rápidas mais compactas */}
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
                        Voucher
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

            {/* Indicadores Principais - Layout Clean */}
            <div className="mb-4">
                <Row className="g-3">
                    <Col lg={3} md={6}>
                        <DashboardCard
                            title="Clientes"
                            value={stats.totalClientes || 0}
                            icon={FaUsers}
                            color="primary"
                            subtitle={`${stats.clientesAtivos || 0} ativos este mês`}
                            trend={stats.crescimentoClientes}
                        />
                    </Col>
                    <Col lg={3} md={6}>
                        <DashboardCard
                            title="Descontos Concedidos"
                            value={formatCurrency(stats.descontoTotalDado || 0)}
                            icon={FaPercentage}
                            color="success"
                            subtitle={`${stats.pedidosComDesconto || 0} pedidos com desconto`}
                            trend={stats.crescimentoDesconto}
                        />
                    </Col>
                    <Col lg={3} md={6}>
                        <DashboardCard
                            title="Vendas do Mês"
                            value={formatCurrency(stats.vendasMes || 0)}
                            icon={FaMoneyBillWave}
                            color="info"
                            subtitle={`${stats.pedidosMes || 0} pedidos realizados`}
                            trend={stats.crescimentoVendas}
                        />
                    </Col>
                    <Col lg={3} md={6}>
                        <DashboardCard
                            title="Produtos"
                            value={stats.produtosAtivos || 0}
                            icon={FaShoppingBag}
                            color="warning"
                            subtitle={`${stats.totalProdutos || 0} produtos cadastrados`}
                            trend={stats.crescimentoProdutos}
                        />
                    </Col>
                </Row>
            </div>

            {/* Resumo Compacto */}
            <div className="mb-4">
                <Row className="g-3">
                    <Col md={4}>
                        <Card className="border-0 bg-light-subtle h-100">
                            <Card.Body className="p-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="text-warning">
                                        <FaTrophy size={24} />
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="fw-bold mb-1">Produto Top</h6>
                                        <p className="small text-muted mb-1">{topProducts?.[0]?.nome || 'Nenhum produto vendido'}</p>
                                        <Badge bg="success" className="small">
                                            {topProducts?.[0]?.quantidade_vendida || 0} unidades
                                        </Badge>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 bg-light-subtle h-100">
                            <Card.Body className="p-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="text-info">
                                        <FaCalendarCheck size={24} />
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="fw-bold mb-1">Receita Hoje</h6>
                                        <p className="small text-muted mb-1">{formatCurrency(stats.vendasHoje || 0)}</p>
                                        <Badge bg={stats.crescimentoVendas >= 0 ? "success" : "danger"} className="small">
                                            {stats.crescimentoVendas >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                                            {Math.abs(stats.crescimentoVendas || 0)}%
                                        </Badge>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 bg-light-subtle h-100">
                            <Card.Body className="p-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="text-success">
                                        <FaTicketAlt size={24} />
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="fw-bold mb-1">Vouchers</h6>
                                        <p className="small text-muted mb-1">{stats.vouchersAtivos || 0} ativos</p>
                                        <Badge bg="primary" className="small">
                                            {stats.vouchersUsados || 0} utilizados
                                        </Badge>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Conteúdo Principal */}
            <Row className="g-3">
                {/* Gráfico de Vendas */}
                <Col lg={8}>
                    <ChartCard 
                        title="Vendas dos Últimos 30 Dias"
                        data={chartData?.vendas}
                        type="line"
                    />
                </Col>

                {/* Produtos Mais Vendidos */}
                <Col lg={4}>
                    <TopProducts products={topProducts} />
                </Col>
            </Row>

            {/* Vendas Recentes */}
            <div className="mt-3">
                <RecentSales sales={recentSales} />
            </div>
        </ComponentContainerCard>
    );
};

export default DashboardReportPage;
