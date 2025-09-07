"use client";

import { useState } from 'react';
import { Card, Col, Badge, Modal, Form, Button } from 'react-bootstrap';
import { FaEdit, FaTicketAlt, FaQrcode, FaPercentage, FaTimes } from 'react-icons/fa';
import { useToast } from '@/components/ui/toast';

const VoucherCard = ({ voucher, onUpdate }) => {
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState({
        desconto: voucher.desconto || 0,
        limite_uso: voucher.limite_uso || 0
    });
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleEdit = () => {
        setFormData({
            desconto: voucher.desconto || 0,
            limite_uso: voucher.limite_uso || 0
        });
        setShowEditModal(true);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/parceiro/voucher', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: voucher.id,
                    desconto: parseFloat(formData.desconto),
                    limite_uso: parseInt(formData.limite_uso)
                })
            });

            if (response.ok) {
                toast.success('Sucesso', 'Cupom atualizado com sucesso!');
                setShowEditModal(false);
                if (onUpdate) onUpdate();
            } else {
                toast.error('Erro', 'Falha ao atualizar cupom');
            }
        } catch (error) {
            toast.error('Erro', 'Erro interno');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Col xl={12} className="mb-4">
                <Card className="border-0 shadow-sm h-100">
                    <Card.Body className="p-4">
                        {/* Header com ações */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                                    <FaTicketAlt className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h5 className="mb-1 fw-bold">Cupom Geral</h5>
                                    <p className="text-muted mb-0 small">Válido para qualquer produto/serviço</p>
                                </div>
                            </div>
                            <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="d-flex align-items-center gap-2"
                                onClick={handleEdit}
                            >
                                <FaEdit size={14} />
                                Editar
                            </Button>
                        </div>

                        {/* Destaque Principal */}
                        <div className="text-center py-4 mb-4 bg-light rounded-3">
                            <div className="display-1 text-primary fw-bold mb-2">
                                {voucher.desconto}%
                            </div>
                            <h4 className="text-dark mb-2">DE DESCONTO</h4>
                            <p className="text-muted mb-0">Em qualquer produto ou serviço</p>
                        </div>

                        {/* Informações do cupom */}
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
                                    <FaQrcode className="text-primary" />
                                    <div>
                                        <small className="text-muted d-block">Código</small>
                                        <span className="fw-bold">{voucher.codigo}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
                                    <FaPercentage className="text-success" />
                                    <div>
                                        <small className="text-muted d-block">Limite de uso</small>
                                        <span className="fw-bold">
                                            {voucher.limite_uso === 0 ? 'Ilimitado' : `${voucher.limite_uso} usos`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="mt-3">
                            <Badge bg="success" className="px-3 py-2">
                                ✓ Ativo e Disponível
                            </Badge>
                        </div>
                    </Card.Body>
                </Card>
            </Col>

            {/* Modal de Edição */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <FaEdit className="text-primary" />
                        Editar Cupom Geral
                    </Modal.Title>
                    <Button 
                        variant="link" 
                        className="p-0 border-0 text-muted"
                        onClick={() => setShowEditModal(false)}
                    >
                        <FaTimes />
                    </Button>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <Form>
                        <div className="mb-4">
                            <Form.Label className="fw-bold">Desconto (%)</Form.Label>
                            <div className="input-group">
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.desconto}
                                    onChange={(e) => setFormData({...formData, desconto: e.target.value})}
                                    className="form-control-lg"
                                />
                                <span className="input-group-text">%</span>
                            </div>
                            <small className="text-muted">Percentual de desconto que será aplicado</small>
                        </div>

                        <div className="mb-4">
                            <Form.Label className="fw-bold">Limite de uso</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                value={formData.limite_uso}
                                onChange={(e) => setFormData({...formData, limite_uso: e.target.value})}
                                className="form-control-lg"
                            />
                            <small className="text-muted">0 = Ilimitado, ou defina um número específico</small>
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default VoucherCard;
