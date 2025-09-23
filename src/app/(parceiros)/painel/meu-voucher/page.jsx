"use client";

import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Alert, Spinner, Form, Badge } from "react-bootstrap";
import { FaTicketAlt, FaSave, FaEdit, FaEye, FaPercent, FaDollarSign } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

export default function MeuVoucherPage() {
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [formData, setFormData] = useState({
    titulo: "",
    condicoes: "",
    limite_uso: ""
  });
  const { data: session } = useSession();

  useEffect(() => {
    fetchVoucher();
  }, []);

  const fetchVoucher = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/parceiro/meu-voucher");
      if (response.ok) {
        const data = await response.json();

        if (data.voucher) {
          setVoucher(data.voucher);
          setFormData({
            titulo: data.voucher.titulo || "",
            condicoes: data.voucher.condicoes || "",
            limite_uso: data.voucher.limite_uso || ""
          });
        } else {
          // Todo parceiro deve ter um voucher - algo está errado
          showAlert("Erro: Voucher não encontrado. Contate o suporte.", "danger");
        }
      } else {
        showAlert("Erro ao carregar voucher", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar voucher", "danger");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 5000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.titulo.trim()) {
      showAlert("Título é obrigatório", "danger");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Sempre usar PUT pois o voucher já existe
      const response = await fetch("/api/parceiro/meu-voucher", {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        showAlert(data.message, "success");
        setVoucher(data.voucher);
        setEditing(false);
      } else {
        showAlert(data.error || "Erro ao salvar voucher", "danger");
      }
    } catch (error) {
      showAlert("Erro ao salvar voucher", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    if (voucher) {
      // Restaurar dados do voucher existente
      setFormData({
        titulo: voucher.titulo || "",
        condicoes: voucher.condicoes || "",
        limite_uso: voucher.limite_uso || ""
      });
      setEditing(false);
    } else {
      // Se não tem voucher, limpar formulário
      setFormData({
        titulo: "",
        condicoes: "",
        limite_uso: ""
      });
    }
  };

  if (loading) {
    return (
      <ComponentContainerCard id="meu-voucher-loading">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </ComponentContainerCard>
    );
  }

  return (
    <ComponentContainerCard id="meu-voucher">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0 d-flex align-items-center">
          <FaTicketAlt className="me-2 text-warning" />
          Meu Voucher
        </h3>

        {voucher && !editing && (
          <Button variant="primary" onClick={handleEdit}>
            <FaEdit className="me-2" />
            Editar Voucher
          </Button>
        )}
      </div>

      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      {/* Preview do Voucher */}
      {(voucher || editing) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Row className="mb-4">
            <Col>
              <Card className="border-warning">
                <Card.Header className="bg-warning bg-opacity-10">
                  <h5 className="mb-0 d-flex align-items-center">
                    <FaEye className="me-2" />
                    Prévia - Como os clientes verão seu voucher
                  </h5>
                </Card.Header>
                <Card.Body>
                  <Row className="align-items-center">
                    <Col md={3} className="text-center">
                      <div className="mb-3">
                        <div className="bg-warning text-dark rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                          <span className="fw-bold fs-4">
                            {voucher?.tipo_desconto === 'percentual'
                              ? `${voucher?.valor_desconto || 0}%`
                              : `R$ ${voucher?.valor_desconto || 0}`
                            }
                          </span>
                        </div>
                      </div>
                      <Badge bg="light" text="dark" className="font-monospace">
                        {voucher?.codigo || 'VCH-XXXXX-XXXXX'}
                      </Badge>
                    </Col>
                    <Col md={6}>
                      <h5 className="fw-bold mb-2">
                        {formData.titulo || 'Título do voucher'}
                      </h5>
                      <p className="text-muted mb-2">
                        Desconto de {voucher?.tipo_desconto === 'percentual'
                          ? `${voucher?.valor_desconto || 0}%`
                          : `R$ ${voucher?.valor_desconto || 0}`} para clientes
                      </p>
                      {formData.condicoes && (
                        <div>
                          <small className="text-muted fw-bold">Condições:</small>
                          <p className="small text-muted mb-0">{formData.condicoes}</p>
                        </div>
                      )}
                    </Col>
                    <Col md={3} className="text-center">
                      <Button variant="warning" size="lg" disabled className="fw-bold">
                        <FaTicketAlt className="me-2" />
                        Solicitar Voucher
                      </Button>
                      <small className="text-muted d-block mt-2">
                        Botão que os clientes verão
                      </small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </motion.div>
      )}

      {/* Formulário de Edição/Criação */}
      {editing ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm">
            <Card.Header>
              <h5 className="mb-0">Editar Meu Voucher</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Título do Voucher <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ex: Desconto Exclusivo, Oferta Especial..."
                      value={formData.titulo}
                      onChange={(e) => handleInputChange('titulo', e.target.value)}
                      maxLength={255}
                    />
                    <Form.Text className="text-muted">
                      Nome principal que aparecerá para os clientes
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Desconto Configurado</Form.Label>
                    <div className="bg-light p-3 rounded">
                      <div className="d-flex align-items-center">
                        <div className="bg-warning text-dark rounded-circle d-inline-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                          <span className="fw-bold">
                            {voucher?.tipo_desconto === 'percentual'
                              ? `${voucher?.valor_desconto || 0}%`
                              : `R$ ${voucher?.valor_desconto || 0}`
                            }
                          </span>
                        </div>
                        <div>
                          <div className="fw-bold">
                            {voucher?.tipo_desconto === 'percentual' ? 'Desconto Percentual' : 'Desconto em Valor Fixo'}
                          </div>
                          <small className="text-muted">Apenas o provedor pode alterar o valor do desconto</small>
                        </div>
                      </div>
                    </div>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Limite de Uso</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Ex: 100 (deixe vazio para ilimitado)"
                      value={formData.limite_uso}
                      onChange={(e) => handleInputChange('limite_uso', e.target.value)}
                      min="1"
                    />
                    <Form.Text className="text-muted">
                      Quantas vezes este voucher pode ser usado (opcional)
                    </Form.Text>
                  </Form.Group>
                </Col>


                <Col xs={12}>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">Termos e Condições</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Ex: Válido para compras acima de R$ 100. Não cumulativo com outras promoções..."
                      value={formData.condicoes}
                      onChange={(e) => handleInputChange('condicoes', e.target.value)}
                      maxLength={1000}
                    />
                    <Form.Text className="text-muted">
                      {formData.condicoes.length}/1000 caracteres
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      Atualizar Voucher
                    </>
                  )}
                </Button>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </Card.Body>
          </Card>
        </motion.div>
      ) : null}

      {/* Estatísticas do Voucher */}
      {voucher && !editing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Row className="mt-4">
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Header>
                  <h5 className="mb-0">Estatísticas do Voucher</h5>
                </Card.Header>
                <Card.Body>
                  <Row className="text-center">
                    <Col md={3}>
                      <div className="border-end">
                        <h3 className="fw-bold text-primary">0</h3>
                        <small className="text-muted">Solicitações</small>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="border-end">
                        <h3 className="fw-bold text-success">0</h3>
                        <small className="text-muted">Aprovadas</small>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="border-end">
                        <h3 className="fw-bold text-info">0</h3>
                        <small className="text-muted">Utilizadas</small>
                      </div>
                    </Col>
                    <Col md={3}>
                      <h3 className="fw-bold text-warning">
                        {voucher.limite_uso || '∞'}
                      </h3>
                      <small className="text-muted">Limite</small>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </motion.div>
      )}
    </ComponentContainerCard>
  );
}