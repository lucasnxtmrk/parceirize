"use client";

import { useState, useEffect } from 'react';
import { Card, CardBody, Form, Button, Nav, Tab, Row, Col, Table, CardTitle, Alert, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaQrcode, FaCamera, FaKeyboard, FaTicketAlt } from 'react-icons/fa';
import QRCodeScanner from '@/components/shared/QRCodeScanner';
import PageTransition from '@/components/shared/PageTransition';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { useToast } from '@/components/ui/toast';

const Validacao = () => {
    const [activeTab, setActiveTab] = useState('voucher');

    // Estados para voucher
    const [clientId, setClientId] = useState('');
    const [voucherData, setVoucherData] = useState(null);
    const [loadingVoucher, setLoadingVoucher] = useState(true);

    // Estados para pedidos
    const [qrCode, setQrCode] = useState('');
    const [pedidoDetails, setPedidoDetails] = useState(null);
    const [showQRScanner, setShowQRScanner] = useState(false);

    // Estados gerais
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // Buscar o voucher do parceiro ao carregar a página
    useEffect(() => {
        const fetchVoucherData = async () => {
            try {
                setLoadingVoucher(true);
                const response = await fetch('/api/parceiro/meu-voucher');
                if (response.ok) {
                    const data = await response.json();
                    if (data.voucher) {
                        setVoucherData(data.voucher);
                    }
                } else {
                    console.error('Erro ao buscar voucher do parceiro');
                }
            } catch (error) {
                console.error('Erro ao buscar voucher:', error);
            } finally {
                setLoadingVoucher(false);
            }
        };

        fetchVoucherData();
    }, []);

    const handleVoucherSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/validarVoucher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId,
                    couponCode: voucherData?.codigo || ''
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Voucher Validado!', data.message);
                setClientId('');
            } else {
                toast.error('Erro na Validação', data.error || "Erro ao validar o voucher.");
            }
        } catch (err) {
            console.error("❌ Erro na requisição:", err);
            toast.error('Erro no Sistema', "Erro ao validar o voucher. Tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    };

    const validatePedido = async (code) => {
        setPedidoDetails(null);
        setLoading(true);

        try {
            const response = await fetch('/api/validarPedido', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ qrCode: code }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Pedido Validado!', data.message);
                setPedidoDetails(data);
                setQrCode('');
            } else {
                const errorMsg = data.error || "Erro ao validar o pedido.";
                toast.error('Erro na Validação', errorMsg);
            }
        } catch (err) {
            console.error("❌ Erro na requisição:", err);
            const errorMsg = "Erro ao validar o pedido. Tente novamente mais tarde.";
            toast.error('Erro no Sistema', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handlePedidoSubmit = async (e) => {
        e.preventDefault();
        await validatePedido(qrCode);
    };

    const handleQRScan = async (scannedCode) => {
        await validatePedido(scannedCode);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    };

    return (
        <PageTransition>
            <ComponentContainerCard id="validacao-parceiro">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <CardTitle as="h4" className="mb-0">Sistema de Validação</CardTitle>
                </div>
                
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
            
            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                <Nav variant="tabs" className="mb-3">
                    <Nav.Item>
                        <Nav.Link eventKey="voucher">Vouchers</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="pedidos">Pedidos (QR Code)</Nav.Link>
                    </Nav.Item>
                </Nav>

                <Tab.Content>
                    {/* Tab de Vouchers */}
                    <Tab.Pane eventKey="voucher">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="border-0 shadow-sm">
                                <CardBody className="p-4">
                                    <div className="text-center mb-4">
                                        <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
                                            <FaQrcode size={32} className="text-primary" />
                                        </div>
                                        <h4 className="fw-bold mb-2">Validação de Voucher Geral</h4>
                                        <p className="text-muted mb-0">
                                            Valide cupons gerais do seu estabelecimento de forma rápida e segura
                                        </p>
                                    </div>

                                    <div className="row g-3 mb-4">
                                        <div className="col-md-4">
                                            <div className="d-flex align-items-center p-3 border rounded h-100">
                                                <div className="bg-primary rounded-circle p-2 me-3">
                                                    <FaKeyboard size={16} className="text-white" />
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-dark">1. Digite o ID</div>
                                                    <small className="text-muted">ID da carteirinha</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="d-flex align-items-center p-3 border rounded h-100">
                                                <div className="bg-dark rounded-circle p-2 me-3">
                                                    <FaQrcode size={16} className="text-white" />
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-dark">2. Validar</div>
                                                    <small className="text-muted">Sistema verifica</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="d-flex align-items-center p-3 border rounded h-100">
                                                <div className="bg-primary rounded-circle p-2 me-3">
                                                    <FaCamera size={16} className="text-white" />
                                                </div>
                                                <div>
                                                    <div className="fw-bold text-dark">3. Confirmar</div>
                                                    <small className="text-muted">Desconto aplicado</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {loadingVoucher ? (
                                        <div className="text-center py-4">
                                            <Spinner animation="border" className="me-2" />
                                            <span>Carregando dados do voucher...</span>
                                        </div>
                                    ) : !voucherData ? (
                                        <Alert variant="warning">
                                            <FaTicketAlt className="me-2" />
                                            Você ainda não configurou seu voucher. Configure primeiro na página "Meu Voucher".
                                        </Alert>
                                    ) : (
                                        <>
                                            {/* Informações do Voucher */}
                                            <Card className="bg-light border-0 mb-4">
                                                <CardBody className="p-3">
                                                    <div className="d-flex align-items-center justify-content-between">
                                                        <div>
                                                            <h6 className="fw-bold mb-1 text-primary">
                                                                <FaTicketAlt className="me-2" />
                                                                Seu Voucher Ativo
                                                            </h6>
                                                            <div className="d-flex align-items-center gap-3">
                                                                <div>
                                                                    <small className="text-muted d-block">Título:</small>
                                                                    <span className="fw-bold">{voucherData.titulo}</span>
                                                                </div>
                                                                <div>
                                                                    <small className="text-muted d-block">Código:</small>
                                                                    <code className="bg-primary text-white px-2 py-1 rounded">
                                                                        {voucherData.codigo}
                                                                    </code>
                                                                </div>
                                                                <div>
                                                                    <small className="text-muted d-block">Desconto:</small>
                                                                    <span className="fw-bold text-success">
                                                                        {voucherData.tipo_desconto === 'percentual'
                                                                            ? `${voucherData.valor_desconto}%`
                                                                            : `R$ ${voucherData.valor_desconto}`
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>

                                            <Form onSubmit={handleVoucherSubmit}>
                                                <Row className="g-3">
                                                    <Col md={12}>
                                                        <Form.Group controlId="clientId">
                                                            <Form.Label className="fw-bold mb-2">
                                                                <FaKeyboard className="me-2 text-primary" />
                                                                ID da Carteirinha do Cliente
                                                            </Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                value={clientId}
                                                                onChange={(e) => setClientId(e.target.value)}
                                                                placeholder="Digite o ID da carteirinha"
                                                                size="lg"
                                                                className="border-2"
                                                                required
                                                            />
                                                            <Form.Text className="text-muted">
                                                                Encontre na carteirinha digital do cliente
                                                            </Form.Text>
                                                        </Form.Group>
                                                    </Col>
                                                </Row>

                                                <div className="mt-4 d-grid">
                                                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                        <Button
                                                            type="submit"
                                                            disabled={loading || !clientId}
                                                            variant="primary"
                                                            size="lg"
                                                            className="fw-bold py-3"
                                                        >
                                                            {loading ? (
                                                                <>
                                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                                    Validando voucher...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FaQrcode className="me-2" />
                                                                    Validar Voucher
                                                                </>
                                                            )}
                                                        </Button>
                                                    </motion.div>
                                                </div>
                                            </Form>
                                        </>
                                    )}

                                    {voucherData && (
                                        <div className="mt-4 p-3 border rounded bg-light">
                                            <h6 className="fw-bold text-dark mb-2">
                                                💡 Como validar vouchers
                                            </h6>
                                            <div className="text-muted">
                                                <div className="mb-1"><strong>1.</strong> Peça ao cliente para mostrar a carteirinha digital</div>
                                                <div className="mb-1"><strong>2.</strong> Digite o ID da carteirinha no campo acima</div>
                                                <div className="mb-1"><strong>3.</strong> Seu código de voucher já está configurado automaticamente</div>
                                                <div><strong>4.</strong> Clique em validar e confirme o desconto de <span className="fw-bold text-primary">
                                                    {voucherData.tipo_desconto === 'percentual'
                                                        ? `${voucherData.valor_desconto}%`
                                                        : `R$ ${voucherData.valor_desconto}`
                                                    }</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </motion.div>
                    </Tab.Pane>

                    {/* Tab de Pedidos */}
                    <Tab.Pane eventKey="pedidos">
                        <Card>
                            <CardBody>
                                <h4>Validação de Pedidos</h4>
                                <p className="text-muted">Escaneie o QR Code do pedido do cliente para validar os produtos do seu estabelecimento.</p>


                                <Form onSubmit={handlePedidoSubmit}>
                                    <Form.Group className="mb-3" controlId="qrCode">
                                        <Form.Label>QR Code do Pedido</Form.Label>
                                        <div className="d-flex gap-2 mb-2">
                                            <Form.Control
                                                type="text"
                                                value={qrCode}
                                                onChange={(e) => setQrCode(e.target.value)}
                                                placeholder="Ex: PED-1234567890-abc123de"
                                                required
                                            />
                                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                <Button
                                                    variant="outline-primary"
                                                    onClick={() => setShowQRScanner(true)}
                                                    disabled={loading}
                                                    title="Usar câmera para escanear QR Code"
                                                >
                                                    <FaQrcode />
                                                </Button>
                                            </motion.div>
                                        </div>
                                        <Form.Text className="text-muted">
                                            <FaKeyboard className="me-1" />
                                            Digite o código manualmente ou 
                                            <FaCamera className="mx-1" />
                                            use a câmera para escanear o QR Code
                                        </Form.Text>
                                    </Form.Group>
                                    
                                    <div className="d-flex gap-2">
                                        <Button type="submit" disabled={loading} variant="primary">
                                            {loading ? "Validando..." : "Validar Pedido"}
                                        </Button>
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button 
                                                variant="success" 
                                                onClick={() => setShowQRScanner(true)}
                                                disabled={loading}
                                            >
                                                <FaQrcode className="me-2" />
                                                Escanear QR Code
                                            </Button>
                                        </motion.div>
                                    </div>
                                </Form>

                                {/* Detalhes do pedido validado */}
                                {pedidoDetails && (
                                    <Card className="mt-4">
                                        <Card.Header>
                                            <h5 className="mb-0">Detalhes do Pedido Validado</h5>
                                        </Card.Header>
                                        <CardBody>
                                            <Row className="mb-3">
                                                <Col md={6}>
                                                    <strong>Cliente:</strong> {pedidoDetails.pedido.cliente_nome}<br/>
                                                    <strong>Carteirinha:</strong> {pedidoDetails.pedido.id_carteirinha}<br/>
                                                    <strong>Status:</strong> 
                                                    <span className={`ms-2 badge ${pedidoDetails.pedido.status === 'validado' ? 'bg-success' : 'bg-warning'}`}>
                                                        {pedidoDetails.pedido.status === 'validado' ? 'Completamente Validado' : 'Parcialmente Validado'}
                                                    </span>
                                                </Col>
                                                <Col md={6}>
                                                    <strong>Total do Pedido:</strong> {formatPrice(pedidoDetails.pedido.total_pedido)}<br/>
                                                    <strong>Valor Validado:</strong> 
                                                    <span className="text-success fw-bold ms-2">
                                                        {formatPrice(pedidoDetails.pedido.total_parceiro)}
                                                    </span>
                                                </Col>
                                            </Row>

                                            <h6>Itens Validados:</h6>
                                            <Table size="sm" className="mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>Produto</th>
                                                        <th>Qtd</th>
                                                        <th>Preço Unit.</th>
                                                        <th>Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pedidoDetails.itens.map((item) => (
                                                        <tr key={item.id}>
                                                            <td>{item.produto_nome}</td>
                                                            <td>{item.quantidade}</td>
                                                            <td>{formatPrice(item.preco_unitario)}</td>
                                                            <td className="fw-bold">{formatPrice(item.subtotal)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </CardBody>
                                    </Card>
                                )}
                            </CardBody>
                        </Card>
                    </Tab.Pane>
                </Tab.Content>
            </Tab.Container>

            {/* QR Code Scanner Modal */}
            <QRCodeScanner
                show={showQRScanner}
                onHide={() => setShowQRScanner(false)}
                onScan={handleQRScan}
                title="Escanear QR Code do Pedido"
                placeholder="Cole o código do QR Code do pedido"
            />
                </motion.div>
            </ComponentContainerCard>
        </PageTransition>
    );
};

export default Validacao;
