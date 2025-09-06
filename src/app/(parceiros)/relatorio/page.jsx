"use client";

import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { 
    FaUsers, FaPercentage, FaShoppingBag, FaChartLine, 
    FaMoneyBillWave, FaTicketAlt, FaTrophy, FaCalendarCheck 
} from 'react-icons/fa';
import DashboardCard from './components/DashboardCard';
import ChartCard from './components/ChartCard';
import RecentSales from './components/RecentSales';
import TopProducts from './components/TopProducts';

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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Indicadores Principais */}
            <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
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
                <Col lg={3} md={6} className="mb-3">
                    <DashboardCard
                        title="Desconto Total Dado"
                        value={`R$ ${stats.descontoTotalDado.toFixed(2)}`}
                        icon={FaPercentage}
                        color="success"
                        subtitle={`${stats.pedidosComDesconto} pedidos`}
                        trend={stats.crescimentoDesconto}
                        delay={0.2}
                    />
                </Col>
                <Col lg={3} md={6} className="mb-3">
                    <DashboardCard
                        title="Vendas do Mês"
                        value={`R$ ${stats.vendasMes.toFixed(2)}`}
                        icon={FaMoneyBillWave}
                        color="info"
                        subtitle={`${stats.pedidosMes} pedidos`}
                        trend={stats.crescimentoVendas}
                        delay={0.3}
                    />
                </Col>
                <Col lg={3} md={6} className="mb-3">
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

            <Row className="mb-4">
                {/* Gráfico de Vendas */}
                <Col lg={8} className="mb-4">
                    <ChartCard 
                        title="Vendas dos Últimos 30 Dias"
                        data={chartData.vendas}
                        type="line"
                    />
                </Col>

                {/* Produtos Mais Vendidos */}
                <Col lg={4} className="mb-4">
                    <TopProducts products={topProducts} />
                </Col>
            </Row>

            <Row>
                {/* Vendas Recentes */}
                <Col lg={12}>
                    <RecentSales sales={recentSales} />
                </Col>
            </Row>
        </motion.div>
    );
};

export default DashboardReportPage;
