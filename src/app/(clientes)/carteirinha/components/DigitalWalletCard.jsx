"use client";

import { useSession } from "next-auth/react";
import Image from 'next/image';
import { Button, Card, CardBody, Col, Row, Badge, Spinner } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    FaShoppingCart, FaUser, FaIdCard, 
    FaEye, FaEyeSlash, FaStore
} from 'react-icons/fa';

const DigitalWalletCard = () => {
    const { data: session } = useSession();
    const [showID, setShowID] = useState(false);
    const [carrinho, setCarrinho] = useState({ total: 0, economia_total: 0, itens: [] });
    const [loadingCarrinho, setLoadingCarrinho] = useState(true);
    const [economiaHistorica, setEconomiaHistorica] = useState(null);
    const [loadingHistorico, setLoadingHistorico] = useState(true);

    // Buscar informações do carrinho e histórico de economia
    useEffect(() => {
        const fetchCarrinho = async () => {
            try {
                const response = await fetch('/api/carrinho');
                if (response.ok) {
                    const data = await response.json();
                    setCarrinho(data);
                }
            } catch (error) {
                console.error('Erro ao buscar carrinho:', error);
            } finally {
                setLoadingCarrinho(false);
            }
        };

        const fetchEconomiaHistorica = async () => {
            try {
                const response = await fetch('/api/cliente/economia-historica');
                if (response.ok) {
                    const data = await response.json();
                    setEconomiaHistorica(data);
                }
            } catch (error) {
                console.error('Erro ao buscar economia histórica:', error);
            } finally {
                setLoadingHistorico(false);
            }
        };

        if (session?.user) {
            fetchCarrinho();
            fetchEconomiaHistorica();
        }
    }, [session]);

    // Se o usuário não estiver logado, mostrar mensagem
    if (!session || !session.user) {
        return (
            <Col xs={12}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Card className="border-0 shadow-sm">
                        <CardBody className="text-center py-5">
                            <FaUser className="text-muted mb-3" size={48} />
                            <h4 className="text-muted mb-2">Acesso necessário</h4>
                            <p className="text-muted">Por favor, faça login para ver sua carteirinha digital.</p>
                        </CardBody>
                    </Card>
                </motion.div>
            </Col>
        );
    }

    const { nome, sobrenome, id_carteirinha, data_ultimo_voucher } = session.user; // Pegando os dados do usuário autenticado

    const nomeCompleto = `${nome} ${sobrenome}`; // Concatenar nome + sobrenome
    const ultimaUtilizacao = data_ultimo_voucher ? new Date(data_ultimo_voucher).toLocaleString("pt-BR") : "Nunca usado"; // Formatando data

    const toggleID = () => {
        setShowID(!showID);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price || 0);
    };

    return (
        <>
            {/* Carteirinha Digital Minimalista */}
            <Col xs={12} className="mb-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Card className="border-0" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <CardBody className="p-4">
                            {/* Header Simples */}
                            <Row className="align-items-center mb-3 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <Col>
                                    <div className="d-flex align-items-center">
                                        <div 
                                            className="me-3 d-flex align-items-center justify-content-center"
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <FaIdCard style={{ color: '#64748b' }} size={20} />
                                        </div>
                                        <div>
                                            <h4 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>PARCEIRIZE</h4>
                                            <small style={{ color: '#64748b' }}>Carteirinha Digital</small>
                                        </div>
                                    </div>
                                </Col>
                                <Col xs="auto">
                                    <Badge 
                                        className="px-3 py-2"
                                        style={{
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        ATIVO
                                    </Badge>
                                </Col>
                            </Row>

                            <Row>
                                <Col lg={8}>
                                    {/* Informações do Cliente */}
                                    <div className="mb-3">
                                        <small className="d-block mb-2" style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '500' }}>
                                            NOME DO TITULAR
                                        </small>
                                        <h3 className="mb-0 fw-bold" style={{ 
                                            color: '#1e293b',
                                            fontSize: '1.5rem'
                                        }}>
                                            {nomeCompleto}
                                        </h3>
                                    </div>

                                    <Row>
                                        <Col md={6}>
                                            <div className="mb-3">
                                                <small className="d-block mb-1" style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '500' }}>
                                                    ID MEMBRO
                                                </small>
                                                <div className="d-flex align-items-center">
                                                    <span 
                                                        className="me-2" 
                                                        style={{ 
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.9rem',
                                                            color: '#1e293b',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        {showID ? id_carteirinha : '•••••••'}
                                                    </span>
                                                    <Button 
                                                        variant="link" 
                                                        size="sm" 
                                                        className="p-0"
                                                        onClick={toggleID}
                                                        style={{ color: '#64748b' }}
                                                    >
                                                        {showID ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="mb-3">
                                                <small className="d-block mb-1" style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '500' }}>
                                                    ÚLTIMO USO
                                                </small>
                                                <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>
                                                    {data_ultimo_voucher ? 
                                                        new Date(data_ultimo_voucher).toLocaleDateString('pt-BR') : 
                                                        'Nunca usado'
                                                    }
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Col>

                                <Col lg={4}>
                                    {/* Economia Total */}
                                    {!loadingHistorico && economiaHistorica && (
                                        <div className="text-center mt-3 mt-lg-0">
                                            <div 
                                                className="p-3 rounded-3"
                                                style={{ backgroundColor: '#f8fafc' }}
                                            >
                                                <small className="d-block mb-1" style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '500' }}>
                                                    TOTAL ECONOMIZADO
                                                </small>
                                                <h2 className="mb-0 fw-bold" style={{ color: '#10b981', fontSize: '2rem' }}>
                                                    {formatPrice(economiaHistorica.economiaTotal)}
                                                </h2>
                                                <small style={{ color: '#64748b' }}>
                                                    {economiaHistorica.totalPedidos} pedido{economiaHistorica.totalPedidos !== 1 ? 's' : ''}
                                                </small>
                                            </div>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>
                </motion.div>
            </Col>

            {/* Estatísticas Simplificadas */}
            {!loadingHistorico && economiaHistorica && (
                <Col xs={12} className="mb-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Card className="border-0" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                            <CardBody className="p-4">
                                <div className="mb-3">
                                    <h6 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>Resumo de Economias</h6>
                                </div>

                                <Row className="g-3">
                                    <Col md={4}>
                                        <div className="text-center">
                                            <h4 className="mb-1 fw-bold" style={{ color: '#1e293b' }}>
                                                {economiaHistorica.totalPedidos}
                                            </h4>
                                            <small style={{ color: '#64748b', fontWeight: '500' }}>Pedidos realizados</small>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-center">
                                            <h4 className="mb-1 fw-bold" style={{ color: '#1e293b' }}>
                                                {economiaHistorica.parceirosUsados}
                                            </h4>
                                            <small style={{ color: '#64748b', fontWeight: '500' }}>Parceiros utilizados</small>
                                        </div>
                                    </Col>
                                    {economiaHistorica.economiaMedia > 0 && (
                                        <Col md={4}>
                                            <div className="text-center">
                                                <h4 className="mb-1 fw-bold" style={{ color: '#1e293b' }}>
                                                    {formatPrice(economiaHistorica.economiaMedia)}
                                                </h4>
                                                <small style={{ color: '#64748b', fontWeight: '500' }}>Economia média</small>
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                            </CardBody>
                        </Card>
                    </motion.div>
                </Col>
            )}

            {/* Carrinho Atual (apenas se tiver itens) */}
            {!loadingCarrinho && carrinho.itens.length > 0 && (
                <Col xs={12} className="mb-3">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <Card className="border-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
                            <CardBody className="p-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <div className="d-flex align-items-center">
                                        <div 
                                            className="me-3 d-flex align-items-center justify-content-center"
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '8px'
                                            }}
                                        >
                                            <FaShoppingCart style={{ color: '#64748b' }} size={20} />
                                        </div>
                                        <div>
                                            <h6 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>Carrinho Atual</h6>
                                            <small style={{ color: '#64748b' }}>
                                                {carrinho.itens.length} item{carrinho.itens.length !== 1 ? 's' : ''}
                                            </small>
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <h4 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>
                                            {formatPrice(carrinho.total)}
                                        </h4>
                                        {carrinho.economia_total > 0 && (
                                            <small style={{ color: '#10b981', fontWeight: '600' }}>
                                                -{formatPrice(carrinho.economia_total)} economia
                                            </small>
                                        )}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </motion.div>
                </Col>
            )}

            {/* Parceiros Favoritos */}
            {!loadingHistorico && economiaHistorica && economiaHistorica.topParceiros && economiaHistorica.topParceiros.length > 0 && (
                <Col xs={12} className="mb-3">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        <Card className="border-0 shadow-sm" style={{ backgroundColor: '#ffffff' }}>
                            <CardBody className="p-3">
                                <div className="mb-3">
                                    <h6 className="mb-0 fw-bold" style={{ color: '#1e293b' }}>Parceiros Mais Utilizados</h6>
                                    <small style={{ color: '#64748b' }}>Onde você mais economiza</small>
                                </div>

                                <div className="list-group list-group-flush">
                                    {economiaHistorica.topParceiros.slice(0, 3).map((parceiro, index) => (
                                        <motion.div
                                            key={parceiro.parceiro_id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * index }}
                                            className={`d-flex align-items-center py-2 ${index < 2 ? 'border-bottom' : ''}`}
                                            style={{ borderColor: '#f1f5f9' }}
                                        >
                                            <div 
                                                className="me-3 d-flex align-items-center justify-content-center flex-shrink-0"
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    backgroundColor: '#f8fafc',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                {parceiro.parceiro_foto ? (
                                                    <Image 
                                                        src={parceiro.parceiro_foto} 
                                                        alt={parceiro.parceiro_nome}
                                                        width={32}
                                                        height={32}
                                                        className="rounded"
                                                        style={{ 
                                                            width: '32px', 
                                                            height: '32px', 
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                ) : (
                                                    <FaStore style={{ color: '#64748b' }} size={16} />
                                                )}
                                            </div>
                                            <div className="flex-grow-1 min-width-0">
                                                <h6 className="mb-1 fw-bold" style={{ 
                                                    color: '#1e293b',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {parceiro.parceiro_nome}
                                                </h6>
                                                <small style={{ color: '#64748b' }}>
                                                    {parceiro.pedidos_count} pedido{parceiro.pedidos_count !== 1 ? 's' : ''}
                                                </small>
                                            </div>
                                            <div className="text-end">
                                                <div className="fw-bold" style={{ 
                                                    color: '#10b981',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {formatPrice(parceiro.economia_total)}
                                                </div>
                                                <small style={{ color: '#64748b' }}>economizado</small>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    </motion.div>
                </Col>
            )}
        </>
    );
};

export default DigitalWalletCard;
