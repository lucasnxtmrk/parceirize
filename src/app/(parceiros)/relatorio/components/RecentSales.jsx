"use client";

import { Card, Table, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaUser, FaShoppingBag } from 'react-icons/fa';

const RecentSales = ({ sales = [] }) => {
    const formatPrice = (price) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'pendente': { bg: 'warning', text: 'Pendente' },
            'validado': { bg: 'success', text: 'Validado' },
            'cancelado': { bg: 'danger', text: 'Cancelado' }
        };

        const config = statusConfig[status] || { bg: 'secondary', text: 'Desconhecido' };
        return <Badge bg={config.bg}>{config.text}</Badge>;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
        >
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white border-0">
                    <div className="d-flex align-items-center">
                        <FaShoppingBag className="text-primary me-2" />
                        <h5 className="mb-0 fw-bold">Vendas Recentes</h5>
                    </div>
                    <small className="text-muted">Últimos pedidos validados</small>
                </Card.Header>
                <Card.Body className="p-0">
                    {sales.length > 0 ? (
                        <div className="table-responsive">
                            <Table className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="border-0 fw-medium">Pedido</th>
                                        <th className="border-0 fw-medium">Cliente</th>
                                        <th className="border-0 fw-medium">Data</th>
                                        <th className="border-0 fw-medium">Valor</th>
                                        <th className="border-0 fw-medium">Desconto</th>
                                        <th className="border-0 fw-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map((sale, index) => (
                                        <motion.tr
                                            key={sale.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 * index }}
                                            className="border-0"
                                        >
                                            <td className="border-0 py-3">
                                                <div className="fw-medium">#{sale.id}</div>
                                                <small className="text-muted">
                                                    {sale.itens_count} ite{sale.itens_count !== 1 ? 'ns' : 'm'}
                                                </small>
                                            </td>
                                            <td className="border-0 py-3">
                                                <div className="d-flex align-items-center">
                                                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2"
                                                         style={{ width: '32px', height: '32px' }}>
                                                        <FaUser className="text-muted" size={12} />
                                                    </div>
                                                    <div>
                                                        <div className="fw-medium">{sale.cliente_nome}</div>
                                                        <small className="text-muted">ID: {sale.cliente_id}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border-0 py-3">
                                                <div className="d-flex align-items-center">
                                                    <FaCalendarAlt className="text-muted me-1" size={12} />
                                                    <small>{formatDate(sale.created_at)}</small>
                                                </div>
                                            </td>
                                            <td className="border-0 py-3">
                                                <div className="fw-bold text-primary">
                                                    {formatPrice(sale.total)}
                                                </div>
                                                {sale.total_original && sale.total_original !== sale.total && (
                                                    <small className="text-muted text-decoration-line-through">
                                                        {formatPrice(sale.total_original)}
                                                    </small>
                                                )}
                                            </td>
                                            <td className="border-0 py-3">
                                                {sale.desconto_total > 0 ? (
                                                    <span className="text-success fw-medium">
                                                        -{formatPrice(sale.desconto_total)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                            <td className="border-0 py-3">
                                                {getStatusBadge(sale.status)}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <div className="mb-3">📋</div>
                            <p className="mb-0">Nenhuma venda recente encontrada</p>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </motion.div>
    );
};

export default RecentSales;