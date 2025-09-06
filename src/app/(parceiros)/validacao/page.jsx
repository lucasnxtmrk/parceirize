"use client";

import { useState } from 'react';
import { Card, CardBody, Form, Button, Nav, Tab, Row, Col, Table, CardTitle } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { FaQrcode, FaCamera, FaKeyboard } from 'react-icons/fa';
import QRCodeScanner from '@/components/shared/QRCodeScanner';
import PageTransition from '@/components/shared/PageTransition';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { useToast } from '@/components/ui/Toast';

const Validacao = () => {
    const [activeTab, setActiveTab] = useState('voucher');
    
    // Estados para voucher
    const [clientId, setClientId] = useState('');
    const [couponCode, setCouponCode] = useState('');
    
    // Estados para pedidos
    const [qrCode, setQrCode] = useState('');
    const [pedidoDetails, setPedidoDetails] = useState(null);
    const [showQRScanner, setShowQRScanner] = useState(false);
    
    // Estados gerais
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleVoucherSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/validarVoucher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clientId, couponCode }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Voucher Validado!', data.message);
                setClientId('');
                setCouponCode('');
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
                        <Card>
                            <CardBody>
                                <h4>Validação de Vouchers</h4>
                                <p className="text-muted">Valide vouchers tradicionais usando ID da carteirinha e código do voucher.</p>


                                <Form onSubmit={handleVoucherSubmit}>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3" controlId="clientId">
                                                <Form.Label>ID da Carteirinha do Cliente</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={clientId}
                                                    onChange={(e) => setClientId(e.target.value)}
                                                    placeholder="Ex: 12345"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3" controlId="couponCode">
                                                <Form.Label>Código do Voucher</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value)}
                                                    placeholder="Ex: DESC10"
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Button type="submit" disabled={loading} variant="primary">
                                        {loading ? "Validando..." : "Validar Voucher"}
                                    </Button>
                                </Form>
                            </CardBody>
                        </Card>
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
