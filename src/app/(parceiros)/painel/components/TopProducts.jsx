"use client";

import { Card, ListGroup, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaTrophy, FaMedal } from 'react-icons/fa';

const TopProducts = ({ products = [] }) => {
    const formatPrice = (price) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    };

    const getRankIcon = (index) => {
        if (index === 0) return <FaTrophy className="text-warning me-2" size={16} />;
        if (index === 1) return <FaMedal className="text-secondary me-2" size={16} />;
        if (index === 2) return <FaMedal className="text-warning me-2" size={16} style={{ opacity: 0.7 }} />;
        return <span className="me-3 fw-bold text-muted">{index + 1}</span>;
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
        >
            <Card className="h-100 shadow-sm border-0">
                <Card.Header className="bg-white border-0 pb-0">
                    <h5 className="mb-0 fw-bold">Produtos Mais Vendidos</h5>
                    <small className="text-muted">Últimos 30 dias</small>
                </Card.Header>
                <Card.Body className="p-0">
                    {products.length > 0 ? (
                        <ListGroup variant="flush">
                            {products.map((product, index) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                >
                                    <ListGroup.Item className="border-0 py-3">
                                        <div className="d-flex align-items-center">
                                            {getRankIcon(index)}
                                            <div className="flex-grow-1">
                                                <h6 className="mb-1 fw-medium">{product.nome}</h6>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <small className="text-muted">
                                                            {product.quantidade_vendida} vendidos
                                                        </small>
                                                        {product.desconto > 0 && (
                                                            <Badge bg="success" className="ms-2">
                                                                {product.desconto}% OFF
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="fw-bold text-primary">
                                                            {formatPrice(product.receita_total)}
                                                        </div>
                                                        <small className="text-muted">
                                                            {formatPrice(product.preco)} cada
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                </motion.div>
                            ))}
                        </ListGroup>
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <div className="mb-3">🛍️</div>
                            <p className="mb-0">Nenhuma venda registrada ainda</p>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </motion.div>
    );
};

export default TopProducts;