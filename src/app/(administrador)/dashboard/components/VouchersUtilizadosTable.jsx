"use client";

import { useState, useEffect } from "react";
import { Table, Card, Badge } from "react-bootstrap";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

const VouchersUtilizadosTable = ({ compact = false }) => {
    const [vouchersUtilizados, setVouchersUtilizados] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVouchersUtilizados();
    }, []);

    const fetchVouchersUtilizados = async () => {
        try {
            const response = await fetch('/api/admin/vouchers-utilizados');
            if (response.ok) {
                const data = await response.json();
                setVouchersUtilizados(data);
            }
        } catch (error) {
            console.error('Erro ao carregar vouchers utilizados:', error);
            // Mock data for demonstration
            setVouchersUtilizados([
                {
                    id: 1,
                    codigo: 'PIZZA20',
                    cliente: 'João Silva',
                    dataUtilizacao: '2024-01-15',
                    valorDesconto: 'R$ 15,00',
                    parceiro: 'Pizzaria do João',
                    status: 'utilizado'
                },
                {
                    id: 2,
                    codigo: 'BURGER15',
                    cliente: 'Maria Santos',
                    dataUtilizacao: '2024-01-14',
                    valorDesconto: 'R$ 8,50',
                    parceiro: 'Burger House',
                    status: 'utilizado'
                },
                {
                    id: 3,
                    codigo: 'CAFE10',
                    cliente: 'Pedro Costa',
                    dataUtilizacao: '2024-01-13',
                    valorDesconto: 'R$ 3,00',
                    parceiro: 'Café Central',
                    status: 'utilizado'
                },
                {
                    id: 4,
                    codigo: 'SUSHI25',
                    cliente: 'Ana Oliveira',
                    dataUtilizacao: '2024-01-12',
                    valorDesconto: 'R$ 22,75',
                    parceiro: 'Sushi Master',
                    status: 'utilizado'
                },
                {
                    id: 5,
                    codigo: 'SORVETE5',
                    cliente: 'Carlos Lima',
                    dataUtilizacao: '2024-01-11',
                    valorDesconto: 'R$ 2,50',
                    parceiro: 'Sorveteria Gelato',
                    status: 'utilizado'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const displayedVouchers = compact ? vouchersUtilizados.slice(0, 5) : vouchersUtilizados;

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
                        {compact ? 'Vouchers Recentes' : 'Vouchers Utilizados'}
                    </h6>
                    {compact && (
                        <p className="text-muted mb-0" style={{fontSize: '0.8125rem'}}>
                            Últimos vouchers utilizados
                        </p>
                    )}
                </div>
                <Badge 
                    bg="success" 
                    className="rounded-pill"
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: '#22c55e'
                    }}
                >
                    {vouchersUtilizados.length}
                </Badge>
            </Card.Header>
            
            <Card.Body className="p-0">
                {loading ? (
                    <div className="p-4">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead style={{backgroundColor: '#f8fafc'}}>
                                    <tr>
                                        <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Código</th>
                                        <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Cliente</th>
                                        <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Data</th>
                                        <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Desconto</th>
                                        {!compact && <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Parceiro</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i}>
                                            <td style={{padding: '0.75rem', borderColor: '#e2e8f0'}}>
                                                <div className="skeleton-loading" style={{width: '80px', height: '16px', borderRadius: '4px'}}></div>
                                            </td>
                                            <td style={{padding: '0.75rem', borderColor: '#e2e8f0'}}>
                                                <div className="skeleton-loading" style={{width: '120px', height: '16px', borderRadius: '4px'}}></div>
                                            </td>
                                            <td style={{padding: '0.75rem', borderColor: '#e2e8f0'}}>
                                                <div className="skeleton-loading" style={{width: '80px', height: '16px', borderRadius: '4px'}}></div>
                                            </td>
                                            <td style={{padding: '0.75rem', borderColor: '#e2e8f0'}}>
                                                <div className="skeleton-loading" style={{width: '60px', height: '16px', borderRadius: '4px'}}></div>
                                            </td>
                                            {!compact && (
                                                <td style={{padding: '0.75rem', borderColor: '#e2e8f0'}}>
                                                    <div className="skeleton-loading" style={{width: '100px', height: '16px', borderRadius: '4px'}}></div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead style={{backgroundColor: '#f8fafc'}}>
                                <tr>
                                    <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Código</th>
                                    <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Cliente</th>
                                    <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Data</th>
                                    <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Desconto</th>
                                    {!compact && <th style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#374151', fontWeight: '600', fontSize: '0.875rem'}}>Parceiro</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedVouchers && displayedVouchers.length > 0 ? (
                                    displayedVouchers.map((voucher, index) => (
                                        <tr key={voucher.id || index} style={{borderColor: '#e2e8f0'}}>
                                            <td style={{padding: '0.75rem', borderColor: '#e2e8f0'}}>
                                                <code 
                                                    style={{
                                                        backgroundColor: '#f1f5f9',
                                                        color: '#3b82f6',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8125rem',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    {voucher.codigo}
                                                </code>
                                            </td>
                                            <td style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#475569', fontSize: '0.875rem'}}>
                                                {voucher.cliente}
                                            </td>
                                            <td style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#475569', fontSize: '0.875rem'}}>
                                                {formatDate(voucher.dataUtilizacao)}
                                            </td>
                                            <td style={{padding: '0.75rem', borderColor: '#e2e8f0'}}>
                                                <span 
                                                    style={{
                                                        color: '#16a34a',
                                                        fontWeight: '600',
                                                        fontSize: '0.875rem'
                                                    }}
                                                >
                                                    {voucher.valorDesconto}
                                                </span>
                                            </td>
                                            {!compact && (
                                                <td style={{padding: '0.75rem', borderColor: '#e2e8f0', color: '#475569', fontSize: '0.875rem'}}>
                                                    {voucher.parceiro}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td 
                                            colSpan={compact ? "4" : "5"} 
                                            className="text-center py-5"
                                            style={{padding: '3rem 1.5rem', borderColor: '#e2e8f0'}}
                                        >
                                            <IconifyIcon 
                                                icon="heroicons:ticket" 
                                                className="text-muted mb-3"
                                                style={{fontSize: '48px'}}
                                            />
                                            <h6 className="text-muted mb-2">Nenhum voucher utilizado</h6>
                                            <p className="text-muted mb-0" style={{fontSize: '0.875rem'}}>
                                                Os vouchers utilizados aparecerão aqui.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default VouchersUtilizadosTable;