"use client";

import { useState, useEffect } from "react";
import { Row, Col, Card } from "react-bootstrap";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

const DashboardStats = () => {
    const [stats, setStats] = useState({
        totalClientes: 0,
        totalParceiros: 0,
        totalVouchers: 0,
        vouchersUtilizados: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/dashboard-stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: "Total Clientes",
            value: stats.totalClientes,
            icon: "heroicons:users",
            color: "primary",
            bgColor: "#eff6ff"
        },
        {
            title: "Total Parceiros",
            value: stats.totalParceiros,
            icon: "heroicons:building-storefront",
            color: "success",
            bgColor: "#f0fdf4"
        },
        {
            title: "Total Vouchers",
            value: stats.totalVouchers,
            icon: "heroicons:ticket",
            color: "warning",
            bgColor: "#fffbeb"
        },
        {
            title: "Vouchers Utilizados",
            value: stats.vouchersUtilizados,
            icon: "heroicons:check-circle",
            color: "info",
            bgColor: "#f0f9ff"
        }
    ];

    if (loading) {
        return (
            <Row className="stats-cards">
                {[1, 2, 3, 4].map((i) => (
                    <Col key={i} lg={3} md={6} sm={6} xs={12}>
                        <Card className="h-100">
                            <Card.Body>
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0">
                                        <div 
                                            className="skeleton-loading"
                                            style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '12px'
                                            }}
                                        ></div>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <div 
                                            className="skeleton-loading mb-2"
                                            style={{
                                                width: '80px',
                                                height: '16px',
                                                borderRadius: '4px'
                                            }}
                                        ></div>
                                        <div 
                                            className="skeleton-loading"
                                            style={{
                                                width: '60px',
                                                height: '24px',
                                                borderRadius: '4px'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    }

    return (
        <Row className="stats-cards">
            {statCards.map((stat, index) => (
                <Col key={index} lg={3} md={6} sm={6} xs={12}>
                    <Card className="h-100 border-0" style={{backgroundColor: '#ffffff'}}>
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center">
                                <div 
                                    className="flex-shrink-0 d-flex align-items-center justify-content-center"
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        backgroundColor: stat.bgColor,
                                        borderRadius: '12px'
                                    }}
                                >
                                    <IconifyIcon 
                                        icon={stat.icon} 
                                        className={`text-${stat.color}`}
                                        style={{fontSize: '24px'}}
                                    />
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <p 
                                        className="text-muted mb-1"
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {stat.title}
                                    </p>
                                    <h4 
                                        className="mb-0"
                                        style={{
                                            fontSize: '1.75rem',
                                            fontWeight: '600',
                                            color: '#0f172a'
                                        }}
                                    >
                                        {stat.value.toLocaleString()}
                                    </h4>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default DashboardStats;