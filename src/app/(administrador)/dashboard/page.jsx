"use client";

import { useState } from "react";
import { Row, Col, Container } from "react-bootstrap";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import PageTitle from "@/components/PageTitle";
import DashboardStats from "./components/DashboardStats";
import QuickActions from "./components/QuickActions";
import RecentActivity from "./components/RecentActivity";
import VouchersUtilizadosTable from "./components/VouchersUtilizadosTable";

const AdminDashboard = () => {
    const router = useRouter();

    const handleActionClick = (path) => {
        router.push(path);
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
            <PageTitle title="Dashboard" subName="Visão Geral" />
            
            <Container fluid>
                {/* Estatísticas Principais */}
                <motion.section variants={sectionVariants} className="mb-5">
                    <DashboardStats />
                </motion.section>

                {/* Ações Rápidas */}
                <motion.section variants={sectionVariants} className="mb-5">
                    <QuickActions onActionClick={handleActionClick} />
                </motion.section>

                {/* Conteúdo Principal */}
                <Row className="g-4 mb-4">
                    {/* Atividade Recente */}
                    <Col xl={4} lg={6}>
                        <motion.div variants={sectionVariants}>
                            <RecentActivity />
                        </motion.div>
                    </Col>
                    
                    {/* Vouchers Utilizados */}
                    <Col xl={8} lg={6}>
                        <motion.div variants={sectionVariants}>
                            <VouchersUtilizadosTable compact />
                        </motion.div>
                    </Col>
                </Row>
            </Container>
        </motion.div>
    );
};

export default AdminDashboard;
