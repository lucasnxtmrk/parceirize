"use client";

import { useState, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import { CardTitle } from "react-bootstrap";
import { 
    FaUsers, FaHandshake, FaTicketAlt, FaShoppingBag, 
    FaChartLine, FaMoneyBillWave, FaPercentage 
} from 'react-icons/fa';
import QuickActions from "./components/QuickActions";
import RecentActivity from "./components/RecentActivity";
import VouchersUtilizadosTable from "./components/VouchersUtilizadosTable";
import { 
    GrowthLineChart, 
    VouchersBarChart, 
    DistribuitionDoughnutChart, 
    SalesAreaChart,
    KPICard
} from "./components/ModernCharts";

const AdminDashboard = () => {
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleActionClick = (path) => {
        router.push(path);
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/dashboard-complete');
            if (!response.ok) {
                throw new Error('Erro ao carregar dados do dashboard');
            }
            const data = await response.json();
            setDashboardData(data);
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
        <ComponentContainerCard id="admin-dashboard">
            {/* Cabeçalho: Título */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle as="h4" className="mb-0">Dashboard - Visão Geral</CardTitle>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Estatísticas Principais - Cards KPI */}
                <motion.section variants={sectionVariants} className="mb-4">
                    <Row className="g-3">
                        <Col xl={3} lg={6} md={6}>
                            <KPICard
                                title="Total de Clientes"
                                value={dashboardData?.stats?.totalClientes}
                                subtitle="Clientes ativos na plataforma"
                                icon={FaUsers}
                                color="#3b82f6"
                            />
                        </Col>
                        <Col xl={3} lg={6} md={6}>
                            <KPICard
                                title="Total de Parceiros"
                                value={dashboardData?.stats?.totalParceiros}
                                subtitle="Parceiros cadastrados"
                                icon={FaHandshake}
                                color="#10b981"
                            />
                        </Col>
                        <Col xl={3} lg={6} md={6}>
                            <KPICard
                                title="Vouchers Ativos"
                                value={dashboardData?.stats?.totalVouchers}
                                subtitle={`${dashboardData?.stats?.vouchersUtilizados || 0} utilizados`}
                                icon={FaTicketAlt}
                                color="#f59e0b"
                            />
                        </Col>
                        <Col xl={3} lg={6} md={6}>
                            <KPICard
                                title="Receita Total"
                                value={dashboardData?.stats?.receitaTotal}
                                subtitle="Faturamento acumulado"
                                icon={FaMoneyBillWave}
                                color="#8b5cf6"
                            />
                        </Col>
                    </Row>
                </motion.section>

                {/* KPIs de Performance */}
                <motion.section variants={sectionVariants} className="mb-4">
                    <Row className="g-3">
                        <Col xl={4} lg={4} md={6}>
                            <KPICard
                                title="Taxa de Utilização de Vouchers"
                                value={dashboardData?.kpis?.taxaUtilizacaoVouchers}
                                subtitle="Vouchers utilizados vs total"
                                icon={FaPercentage}
                                color="#ef4444"
                            />
                        </Col>
                        <Col xl={4} lg={4} md={6}>
                            <KPICard
                                title="Ticket Médio"
                                value={dashboardData?.kpis?.ticketMedio}
                                subtitle="Valor médio por venda"
                                icon={FaChartLine}
                                color="#06b6d4"
                            />
                        </Col>
                        <Col xl={4} lg={4} md={6}>
                            <KPICard
                                title="Receita por Parceiro"
                                value={dashboardData?.kpis?.receitaPorParceiro}
                                subtitle="Média de receita gerada"
                                icon={FaShoppingBag}
                                color="#84cc16"
                            />
                        </Col>
                    </Row>
                </motion.section>

                {/* Ações Rápidas */}
                <motion.section variants={sectionVariants} className="mb-4">
                    <QuickActions onActionClick={handleActionClick} />
                </motion.section>

                {/* Gráficos Principais */}
                <motion.section variants={sectionVariants} className="mb-4">
                    <Row className="g-4">
                        <Col lg={8}>
                            <GrowthLineChart data={dashboardData?.crescimento} />
                        </Col>
                        <Col lg={4}>
                            <DistribuitionDoughnutChart stats={dashboardData?.stats} />
                        </Col>
                    </Row>
                </motion.section>

                {/* Gráficos Secundários */}
                <motion.section variants={sectionVariants} className="mb-4">
                    <Row className="g-4">
                        <Col lg={8}>
                            <SalesAreaChart data={dashboardData?.vendasMensais} />
                        </Col>
                        <Col lg={4}>
                            <VouchersBarChart data={dashboardData?.vouchersCategorias} />
                        </Col>
                    </Row>
                </motion.section>

                {/* Conteúdo Detalhado */}
                <Row className="g-4 mb-4">
                    {/* Atividade Recente */}
                    <Col xl={4} lg={6}>
                        <motion.div variants={sectionVariants}>
                            <RecentActivity data={dashboardData?.atividadeRecente} />
                        </motion.div>
                    </Col>
                    
                    {/* Vouchers Utilizados */}
                    <Col xl={8} lg={6}>
                        <motion.div variants={sectionVariants}>
                            <VouchersUtilizadosTable compact />
                        </motion.div>
                    </Col>
                </Row>
            </motion.div>
        </ComponentContainerCard>
    );
};

export default AdminDashboard;
