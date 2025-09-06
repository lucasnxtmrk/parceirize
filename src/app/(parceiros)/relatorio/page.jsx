"use client";

import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert, Container } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { 
    FaUsers, FaPercentage, FaShoppingBag, FaChartLine, 
    FaMoneyBillWave, FaTicketAlt, FaTrophy, FaCalendarCheck,
    FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import DashboardCard from './components/DashboardCard';
import ChartCard from './components/ChartCard';
import RecentSales from './components/RecentSales';
import TopProducts from './components/TopProducts';
import PageTitle from '@/components/PageTitle';
import { LoadingSkeleton, Badge, Button } from '@/components/ui';

const DashboardReportPage = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await fetch('/api/parceiro/dashboard');
                if (!response.ok) {
                    throw new Error(`Erro ao buscar dados: ${response.status}`);
                }
                const data = await response.json();
                setDashboardData(data);
            } catch (err) {
                console.error("❌ Erro na requisição:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando dashboard...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="text-center">
                <h5>Erro ao carregar dashboard</h5>
                <p>{error}</p>
            </Alert>
        );
    }

    const { stats, recentSales, topProducts, chartData } = dashboardData;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const sectionVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <PageTitle title="Dashboard" subName="Relatórios & Vendas" />
            
            <Container fluid>
                {/* Quick Actions */}
                <motion.section variants={sectionVariants} className="mb-4">
                    <Row className="g-3">
                        <Col md="auto">
                            <Button variant="primary" icon={FaShoppingBag} iconPosition="left">
                                Novo Produto
                            </Button>
                        </Col>
                        <Col md="auto">
                            <Button variant="outline-success" icon={FaTicketAlt} iconPosition="left">
                                Criar Voucher
                            </Button>
                        </Col>
                        <Col md="auto">
                            <Button variant="outline-info" icon={FaChartLine} iconPosition="left">
                                Exportar Relatório
                            </Button>
                        </Col>
                    </Row>
                </motion.section>

                {/* Indicadores Principais */}
                <motion.section variants={sectionVariants} className="mb-4">
                    <Row className="g-4">
                        <Col lg={3} md={6}>
                            <DashboardCard
                                title="Total de Clientes"
                                value={stats.totalClientes}
                                icon={FaUsers}
                                color="primary"
                                subtitle={`${stats.clientesAtivos} ativos`}
                                trend={stats.crescimentoClientes}
                                delay={0.1}
                            />
                        </Col>
                        <Col lg={3} md={6}>
                            <DashboardCard
                                title="Desconto Total Dado"
                                value={formatCurrency(stats.descontoTotalDado)}
                                icon={FaPercentage}
                                color="success"
                                subtitle={`${stats.pedidosComDesconto} pedidos`}
                                trend={stats.crescimentoDesconto}
                                delay={0.2}
                            />
                        </Col>
                        <Col lg={3} md={6}>
                            <DashboardCard
                                title="Vendas do Mês"
                                value={formatCurrency(stats.vendasMes)}
                                icon={FaMoneyBillWave}
                                color="info"
                                subtitle={`${stats.pedidosMes} pedidos`}
                                trend={stats.crescimentoVendas}
                                delay={0.3}
                            />
                        </Col>
                        <Col lg={3} md={6}>
                            <DashboardCard
                                title="Produtos Ativos"
                                value={stats.produtosAtivos}
                                icon={FaShoppingBag}
                                color="warning"
                                subtitle={`${stats.totalProdutos} cadastrados`}
                                trend={stats.crescimentoProdutos}
                                delay={0.4}
                            />
                        </Col>
                    </Row>
                </motion.section>

                {/* Performance Highlights */}
                <motion.section variants={sectionVariants} className="mb-4">
                    <Row className="g-4">
                        <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm">
                                <Card.Body className="text-center">
                                    <div className="mb-3">
                                        <FaTrophy size={32} className="text-warning" />
                                    </div>
                                    <h5>Melhor Produto</h5>
                                    <p className="text-muted mb-2">{topProducts?.[0]?.nome || 'N/A'}</p>
                                    <Badge variant="success">
                                        {topProducts?.[0]?.vendas || 0} vendas
                                    </Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm">
                                <Card.Body className="text-center">
                                    <div className="mb-3">
                                        <FaCalendarCheck size={32} className="text-info" />
                                    </div>
                                    <h5>Hoje</h5>
                                    <p className="text-muted mb-2">{formatCurrency(stats.vendasHoje || 0)}</p>
                                    <Badge variant={stats.crescimentoHoje > 0 ? "success" : "secondary"}>
                                        {stats.crescimentoHoje > 0 ? <FaArrowUp /> : <FaArrowDown />}
                                        {Math.abs(stats.crescimentoHoje || 0)}%
                                    </Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm">
                                <Card.Body className="text-center">
                                    <div className="mb-3">
                                        <FaTicketAlt size={32} className="text-success" />
                                    </div>
                                    <h5>Vouchers Ativos</h5>
                                    <p className="text-muted mb-2">{stats.vouchersAtivos || 0} ativos</p>
                                    <Badge variant="primary">
                                        {stats.vouchersUsados || 0} utilizados
                                    </Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </motion.section>

                <Row className="g-4 mb-4">
                    {/* Gráfico de Vendas */}
                    <Col lg={8}>
                        <motion.div variants={sectionVariants}>
                            <ChartCard 
                                title="Vendas dos Últimos 30 Dias"
                                data={chartData?.vendas}
                                type="line"
                            />
                        </motion.div>
                    </Col>

                    {/* Produtos Mais Vendidos */}
                    <Col lg={4}>
                        <motion.div variants={sectionVariants}>
                            <TopProducts products={topProducts} />
                        </motion.div>
                    </Col>
                </Row>

                <Row>
                    {/* Vendas Recentes */}
                    <Col lg={12}>
                        <motion.div variants={sectionVariants}>
                            <RecentSales sales={recentSales} />
                        </motion.div>
                    </Col>
                </Row>
            </Container>
        </motion.div>
    );
};

export default DashboardReportPage;
