"use client";

import { useState, useEffect } from "react";
import { Card, ListGroup, Badge } from "react-bootstrap";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

const RecentActivity = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentActivity();
    }, []);

    const fetchRecentActivity = async () => {
        try {
            const response = await fetch('/api/admin/recent-activity');
            if (response.ok) {
                const data = await response.json();
                setActivities(data);
            }
        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
            // Mock data for demonstration
            setActivities([
                {
                    id: 1,
                    type: 'voucher_used',
                    description: 'Voucher utilizado por João Silva',
                    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
                    user: 'João Silva',
                    action: 'Voucher utilizado'
                },
                {
                    id: 2,
                    type: 'new_client',
                    description: 'Novo cliente cadastrado: Maria Santos',
                    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
                    user: 'Sistema',
                    action: 'Cliente cadastrado'
                },
                {
                    id: 3,
                    type: 'partner_update',
                    description: 'Parceiro Restaurante ABC atualizou perfil',
                    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
                    user: 'Restaurante ABC',
                    action: 'Perfil atualizado'
                },
                {
                    id: 4,
                    type: 'voucher_created',
                    description: 'Novo voucher criado: 20% OFF Pizzas',
                    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
                    user: 'Admin',
                    action: 'Voucher criado'
                },
                {
                    id: 5,
                    type: 'validation',
                    description: 'Voucher validado no Parceiro XYZ',
                    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
                    user: 'Parceiro XYZ',
                    action: 'Voucher validado'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type) => {
        const icons = {
            voucher_used: 'heroicons:ticket',
            new_client: 'heroicons:user-plus',
            partner_update: 'heroicons:building-storefront',
            voucher_created: 'heroicons:plus-circle',
            validation: 'heroicons:check-circle'
        };
        return icons[type] || 'heroicons:information-circle';
    };

    const getActivityColor = (type) => {
        const colors = {
            voucher_used: 'primary',
            new_client: 'success',
            partner_update: 'info',
            voucher_created: 'warning',
            validation: 'success'
        };
        return colors[type] || 'secondary';
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <Card className="h-100 border-0" style={{backgroundColor: '#ffffff'}}>
            <Card.Header 
                className="d-flex align-items-center justify-content-between"
                style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '1rem 1.5rem'
                }}
            >
                <div>
                    <h6 className="mb-0" style={{color: '#0f172a', fontWeight: '600'}}>
                        Atividade Recente
                    </h6>
                </div>
                <Badge 
                    bg="primary" 
                    className="rounded-pill"
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: '#3b82f6'
                    }}
                >
                    {activities.length}
                </Badge>
            </Card.Header>
            
            <Card.Body className="p-0">
                {loading ? (
                    <div className="p-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="d-flex align-items-center mb-3">
                                <div 
                                    className="skeleton-loading me-3"
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px'
                                    }}
                                ></div>
                                <div className="flex-grow-1">
                                    <div 
                                        className="skeleton-loading mb-1"
                                        style={{
                                            width: '80%',
                                            height: '16px',
                                            borderRadius: '4px'
                                        }}
                                    ></div>
                                    <div 
                                        className="skeleton-loading"
                                        style={{
                                            width: '60%',
                                            height: '12px',
                                            borderRadius: '4px'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <ListGroup variant="flush">
                        {activities.map((activity) => (
                            <ListGroup.Item 
                                key={activity.id} 
                                className="border-0"
                                style={{
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid #f1f5f9'
                                }}
                            >
                                <div className="d-flex align-items-start">
                                    <div 
                                        className="flex-shrink-0 d-flex align-items-center justify-content-center me-3"
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            backgroundColor: `var(--bs-${getActivityColor(activity.type)}-bg-subtle, #f1f5f9)`,
                                            borderRadius: '8px'
                                        }}
                                    >
                                        <IconifyIcon 
                                            icon={getActivityIcon(activity.type)} 
                                            className={`text-${getActivityColor(activity.type)}`}
                                            style={{fontSize: '18px'}}
                                        />
                                    </div>
                                    
                                    <div className="flex-grow-1 min-w-0">
                                        <p 
                                            className="mb-1"
                                            style={{
                                                fontSize: '0.875rem',
                                                fontWeight: '500',
                                                color: '#334155',
                                                lineHeight: '1.4'
                                            }}
                                        >
                                            {activity.description}
                                        </p>
                                        <p 
                                            className="mb-0 text-muted"
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#64748b'
                                            }}
                                        >
                                            {formatTime(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </Card.Body>
            
            {!loading && activities.length === 0 && (
                <Card.Body className="text-center py-5">
                    <IconifyIcon 
                        icon="heroicons:inbox" 
                        className="text-muted mb-3"
                        style={{fontSize: '48px'}}
                    />
                    <h6 className="text-muted">Nenhuma atividade recente</h6>
                    <p className="text-muted mb-0" style={{fontSize: '0.875rem'}}>
                        As atividades aparecerão aqui conforme forem acontecendo.
                    </p>
                </Card.Body>
            )}
        </Card>
    );
};

export default RecentActivity;