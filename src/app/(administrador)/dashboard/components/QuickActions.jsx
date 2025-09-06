"use client";

import { Row, Col, Card, Button } from "react-bootstrap";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

const QuickActions = ({ onActionClick }) => {
    const quickActions = [
        {
            title: "Cadastrar Cliente",
            description: "Adicionar novo cliente ao sistema",
            icon: "heroicons:user-plus",
            color: "primary",
            bgColor: "#eff6ff",
            path: "/admin-cliente"
        },
        {
            title: "Cadastrar Parceiro",
            description: "Adicionar novo parceiro",
            icon: "heroicons:building-storefront",
            color: "success",
            bgColor: "#f0fdf4",
            path: "/admin-parceiro"
        },
        {
            title: "Criar Voucher",
            description: "Criar novo voucher de desconto",
            icon: "heroicons:ticket",
            color: "warning",
            bgColor: "#fffbeb",
            path: "/admin-vouchers/cadastrar"
        },
        {
            title: "Validar Voucher",
            description: "Validar voucher de cliente",
            icon: "heroicons:qr-code",
            color: "info",
            bgColor: "#f0f9ff",
            path: "/admin-validacao"
        }
    ];

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h5 className="mb-1" style={{color: '#0f172a', fontWeight: '600'}}>
                        Ações Rápidas
                    </h5>
                    <p className="text-muted mb-0" style={{fontSize: '0.875rem'}}>
                        Acesso rápido às funcionalidades principais
                    </p>
                </div>
            </div>

            <Row className="g-4">
                {quickActions.map((action, index) => (
                    <Col key={index} lg={3} md={6} sm={6} xs={12}>
                        <Card 
                            className="h-100 border-0 shadow-card hover-lift"
                            style={{
                                backgroundColor: '#ffffff',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                            }}
                            onClick={() => onActionClick(action.path)}
                        >
                            <Card.Body className="p-4 text-center">
                                <div 
                                    className="d-inline-flex align-items-center justify-content-center mb-3"
                                    style={{
                                        width: '64px',
                                        height: '64px',
                                        backgroundColor: action.bgColor,
                                        borderRadius: '16px'
                                    }}
                                >
                                    <IconifyIcon 
                                        icon={action.icon} 
                                        className={`text-${action.color}`}
                                        style={{fontSize: '32px'}}
                                    />
                                </div>
                                
                                <h6 
                                    className="mb-2"
                                    style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: '#0f172a'
                                    }}
                                >
                                    {action.title}
                                </h6>
                                
                                <p 
                                    className="text-muted mb-3"
                                    style={{
                                        fontSize: '0.8125rem',
                                        lineHeight: '1.5'
                                    }}
                                >
                                    {action.description}
                                </p>
                                
                                <Button 
                                    variant={`outline-${action.color}`}
                                    size="sm"
                                    className="w-100"
                                    style={{
                                        borderRadius: '6px',
                                        fontWeight: '500',
                                        fontSize: '0.8125rem'
                                    }}
                                >
                                    Acessar
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <style jsx>{`
                .hover-lift:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default QuickActions;