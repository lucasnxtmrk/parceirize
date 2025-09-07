"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Row, Col, Card, CardTitle, Badge, Table, Button, Nav } from 'react-bootstrap';
import { 
    FaHistory, FaShoppingBag, FaTicketAlt, FaCheck, FaTimes,
    FaCalendarAlt, FaUser, FaClock, FaFilter
} from 'react-icons/fa';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { CardLoading } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/toast';
import { motion } from 'framer-motion';

const HistoricoPage = () => {
    const { data: session, status } = useSession();
    const [historico, setHistorico] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('todos'); // 'todos', 'produtos', 'cupons'
    const [approving, setApproving] = useState({});
    const toast = useToast();

    useEffect(() => {
        const fetchHistorico = async () => {
            if (status !== 'authenticated' || !session?.user || session.user.role !== 'parceiro') {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await fetch('/api/parceiro/historico');
                if (!response.ok) {
                    throw new Error(`Erro ao buscar histórico: ${response.status}`);
                }
                const data = await response.json();
                setHistorico(data.historico || []);
            } catch (err) {
                console.error("❌ Erro na requisição:", err);
                setError(err.message);
                toast.error('Erro ao Carregar', 'Não foi possível carregar o histórico');
            } finally {
                setLoading(false);
            }
        };

        if (status !== 'loading') {
            fetchHistorico();
        }
    }, [session, status]); // Removido 'toast' das dependências

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
            'pendente': { bg: 'warning', text: 'Pendente', icon: FaClock },
            'validado': { bg: 'success', text: 'Validado', icon: FaCheck },
            'cancelado': { bg: 'danger', text: 'Cancelado', icon: FaTimes }
        };

        const config = statusConfig[status] || { bg: 'secondary', text: 'Desconhecido', icon: FaClock };
        const IconComponent = config.icon;
        
        return (
            <Badge bg={config.bg} className="d-flex align-items-center gap-1">
                <IconComponent size={12} />
                {config.text}
            </Badge>
        );
    };

    const getTypeBadge = (type) => {
        if (type === 'produto') {
            return (
                <Badge bg="primary" className="d-flex align-items-center gap-1">
                    <FaShoppingBag size={12} />
                    Produto
                </Badge>
            );
        } else {
            return (
                <Badge bg="success" className="d-flex align-items-center gap-1">
                    <FaTicketAlt size={12} />
                    Cupom
                </Badge>
            );
        }
    };

    const handleApprove = async (id, type) => {
        setApproving(prev => ({ ...prev, [id]: true }));
        
        try {
            const endpoint = type === 'produto' ? '/api/parceiro/aprovar-produto' : '/api/parceiro/aprovar-cupom';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (response.ok) {
                toast.success('Aprovado!', `${type === 'produto' ? 'Produto' : 'Cupom'} aprovado com sucesso`);
                // Atualizar a lista
                setHistorico(prev => prev.map(item => 
                    item.id === id ? { ...item, status: 'validado' } : item
                ));
            } else {
                toast.error('Erro', 'Falha ao aprovar');
            }
        } catch (error) {
            toast.error('Erro', 'Erro interno');
        } finally {
            setApproving(prev => ({ ...prev, [id]: false }));
        }
    };

    const filteredHistorico = historico.filter(item => {
        if (activeTab === 'todos') return true;
        if (activeTab === 'produtos') return item.type === 'produto';
        if (activeTab === 'cupons') return item.type === 'cupom';
        return true;
    });

    const pendingCount = historico.filter(item => item.status === 'pendente').length;

    if (status === 'loading' || loading) {
        return (
            <ComponentContainerCard id="parceiro-historico">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <CardTitle as="h4" className="mb-0">Histórico de Transações</CardTitle>
                </div>
                <CardLoading count={4} />
            </ComponentContainerCard>
        );
    }

    if (status !== 'authenticated' || !session?.user || session.user.role !== 'parceiro') {
        return (
            <ComponentContainerCard id="parceiro-historico">
                <div className="text-center py-5">
                    <h5 className="text-danger mb-3">Acesso Negado</h5>
                    <p className="text-muted">Você precisa estar logado como parceiro para acessar esta página.</p>
                </div>
            </ComponentContainerCard>
        );
    }

    if (error) {
        return (
            <ComponentContainerCard id="parceiro-historico">
                <div className="text-center py-5">
                    <h5 className="text-danger mb-3">Erro ao carregar histórico</h5>
                    <p className="text-muted">{error}</p>
                    <Button variant="primary" onClick={() => window.location.reload()}>
                        Tentar Novamente
                    </Button>
                </div>
            </ComponentContainerCard>
        );
    }

    return (
        <ComponentContainerCard id="parceiro-historico">
            {/* Cabeçalho */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                <div>
                    <CardTitle as="h4" className="mb-1 d-flex align-items-center gap-2">
                        <FaHistory className="text-primary" />
                        Histórico de Transações
                    </CardTitle>
                    <p className="text-muted small mb-0">
                        Acompanhe todas as suas vendas de produtos e utilização de cupons
                    </p>
                </div>
                
                {pendingCount > 0 && (
                    <div className="d-flex align-items-center gap-2">
                        <Badge bg="warning" className="px-3 py-2">
                            <FaClock className="me-1" />
                            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Filtros com Tabs */}
            <div className="mb-4">
                <Nav variant="pills" className="bg-light p-2 rounded">
                    <Nav.Item>
                        <Nav.Link 
                            active={activeTab === 'todos'} 
                            onClick={() => setActiveTab('todos')}
                            className="d-flex align-items-center gap-2"
                        >
                            <FaFilter size={14} />
                            Todos ({historico.length})
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link 
                            active={activeTab === 'produtos'} 
                            onClick={() => setActiveTab('produtos')}
                            className="d-flex align-items-center gap-2"
                        >
                            <FaShoppingBag size={14} />
                            Produtos ({historico.filter(h => h.type === 'produto').length})
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link 
                            active={activeTab === 'cupons'} 
                            onClick={() => setActiveTab('cupons')}
                            className="d-flex align-items-center gap-2"
                        >
                            <FaTicketAlt size={14} />
                            Cupons ({historico.filter(h => h.type === 'cupom').length})
                        </Nav.Link>
                    </Nav.Item>
                </Nav>
            </div>

            {/* Tabela de Histórico */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="shadow-sm border-0">
                    <Card.Body className="p-0">
                        {filteredHistorico.length > 0 ? (
                            <div className="table-responsive">
                                <Table className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="border-0 fw-medium">Tipo</th>
                                            <th className="border-0 fw-medium">ID/Produto</th>
                                            <th className="border-0 fw-medium">Cliente</th>
                                            <th className="border-0 fw-medium">Data</th>
                                            <th className="border-0 fw-medium">Valor</th>
                                            <th className="border-0 fw-medium">Status</th>
                                            <th className="border-0 fw-medium">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistorico.map((item, index) => (
                                            <motion.tr
                                                key={`${item.type}-${item.id}`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 * index }}
                                                className="border-0"
                                            >
                                                <td className="border-0 py-3">
                                                    {getTypeBadge(item.type)}
                                                </td>
                                                <td className="border-0 py-3">
                                                    <div className="fw-medium">#{item.id}</div>
                                                    {item.produto_nome && (
                                                        <small className="text-muted">{item.produto_nome}</small>
                                                    )}
                                                    {item.cupom_codigo && (
                                                        <small className="text-muted">Código: {item.cupom_codigo}</small>
                                                    )}
                                                </td>
                                                <td className="border-0 py-3">
                                                    <div className="d-flex align-items-center">
                                                        <FaUser className="text-muted me-2" size={14} />
                                                        <span className="fw-medium">{item.cliente_nome}</span>
                                                    </div>
                                                </td>
                                                <td className="border-0 py-3">
                                                    <div className="d-flex align-items-center">
                                                        <FaCalendarAlt className="text-muted me-2" size={14} />
                                                        <small>{formatDate(item.data)}</small>
                                                    </div>
                                                </td>
                                                <td className="border-0 py-3">
                                                    <div className="fw-bold text-success">
                                                        {formatPrice(item.valor)}
                                                    </div>
                                                    {item.desconto > 0 && (
                                                        <small className="text-muted">
                                                            {item.desconto}% desconto
                                                        </small>
                                                    )}
                                                </td>
                                                <td className="border-0 py-3">
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="border-0 py-3">
                                                    {item.status === 'pendente' && (
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            onClick={() => handleApprove(item.id, item.type)}
                                                            disabled={approving[item.id]}
                                                            className="d-flex align-items-center gap-1"
                                                        >
                                                            <FaCheck size={12} />
                                                            {approving[item.id] ? 'Aprovando...' : 'Aprovar'}
                                                        </Button>
                                                    )}
                                                    {item.status === 'validado' && (
                                                        <small className="text-success">✓ Aprovado</small>
                                                    )}
                                                    {item.status === 'cancelado' && (
                                                        <small className="text-danger">✗ Cancelado</small>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-5 text-muted">
                                <div className="mb-3">
                                    {activeTab === 'produtos' ? '🛍️' : 
                                     activeTab === 'cupons' ? '🎫' : '📝'}
                                </div>
                                <h5 className="mb-2">Nenhuma transação encontrada</h5>
                                <p className="mb-0">
                                    {activeTab === 'produtos' && 'Nenhuma venda de produto registrada ainda'}
                                    {activeTab === 'cupons' && 'Nenhum cupom utilizado ainda'}
                                    {activeTab === 'todos' && 'Ainda não há histórico de transações'}
                                </p>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </motion.div>
        </ComponentContainerCard>
    );
};

export default HistoricoPage;