"use client";

import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Alert, Form, Spinner, Badge, Modal } from "react-bootstrap";
import { FaUser, FaEnvelope, FaIdCard, FaEdit, FaSave, FaTimes, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useSession } from "next-auth/react";
import ComponentContainerCard from "@/components/ComponentContainerCard";

export default function PerfilClientePage() {
  const { data: session } = useSession();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: "",
    email: ""
  });

  // Estados para alteração de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: ""
  });
  const [showPasswords, setShowPasswords] = useState({
    senhaAtual: false,
    novaSenha: false,
    confirmarSenha: false
  });

  useEffect(() => {
    fetchCliente();
  }, []);

  const fetchCliente = async () => {
    try {
      const response = await fetch("/api/cliente/perfil");
      if (response.ok) {
        const data = await response.json();
        setCliente(data);
        setFormData({
          nome: data.nome || "",
          sobrenome: data.sobrenome || "",
          email: data.email || ""
        });
      } else {
        showAlert("Erro ao carregar perfil", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar perfil", "danger");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 3000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/cliente/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setCliente(data.cliente);
        setEditing(false);
        showAlert("Perfil atualizado com sucesso!", "success");
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Erro ao atualizar perfil", "danger");
      }
    } catch (error) {
      showAlert("Erro ao atualizar perfil", "danger");
    }
  };

  const handleCancel = () => {
    setFormData({
      nome: cliente?.nome || "",
      sobrenome: cliente?.sobrenome || "",
      email: cliente?.email || ""
    });
    setEditing(false);
  };

  // Funções para alteração de senha
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      showAlert("As senhas não coincidem", "danger");
      return;
    }

    if (passwordData.novaSenha.length < 6) {
      showAlert("A nova senha deve ter pelo menos 6 caracteres", "danger");
      return;
    }

    try {
      const response = await fetch("/api/cliente/alterar-senha", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senhaAtual: passwordData.senhaAtual,
          novaSenha: passwordData.novaSenha
        })
      });

      if (response.ok) {
        showAlert("Senha alterada com sucesso!", "success");
        setShowPasswordModal(false);
        setPasswordData({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Erro ao alterar senha", "danger");
      }
    } catch (error) {
      showAlert("Erro ao alterar senha", "danger");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <ComponentContainerCard id="perfil-cliente-loading">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </ComponentContainerCard>
    );
  }

  return (
    <ComponentContainerCard id="perfil-cliente">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Meu Perfil</h4>
        {!editing ? (
          <Button variant="primary" onClick={() => setEditing(true)}>
            <FaEdit className="me-2" />
            Editar
          </Button>
        ) : (
          <div className="d-flex gap-2">
            <Button variant="primary" onClick={handleSave}>
              <FaSave className="me-2" />
              Salvar
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              <FaTimes className="me-2" />
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      <Row>
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0 d-flex align-items-center">
                <FaUser className="me-2" />
                Informações Pessoais
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nome</Form.Label>
                    {editing ? (
                      <Form.Control
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        required
                      />
                    ) : (
                      <Form.Control type="text" value={cliente?.nome || ""} readOnly />
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Sobrenome</Form.Label>
                    {editing ? (
                      <Form.Control
                        type="text"
                        name="sobrenome"
                        value={formData.sobrenome}
                        onChange={handleInputChange}
                        required
                      />
                    ) : (
                      <Form.Control type="text" value={cliente?.sobrenome || ""} readOnly />
                    )}
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>E-mail</Form.Label>
                    <Form.Control
                      type="email"
                      value={editing ? formData.email : cliente?.email || ""}
                      readOnly={!editing}
                      name="email"
                      onChange={editing ? handleInputChange : undefined}
                    />
                    {!editing && (
                      <Form.Text className="text-muted">
                        Para alterar o e-mail, entre em contato com o suporte
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          {/* Card da Carteirinha */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0 d-flex align-items-center">
                <FaIdCard className="me-2" />
                Carteirinha Digital
              </h5>
            </Card.Header>
            <Card.Body className="text-center">
              <div className="mb-3">
                <Badge bg="dark" className="fs-6 px-3 py-2">
                  {cliente?.id_carteirinha}
                </Badge>
              </div>
              <p className="text-muted mb-2">Número da Carteirinha</p>
              <div className="mb-3">
                <Badge
                  bg={cliente?.ativo ? "primary" : "secondary"}
                  className="fs-6"
                >
                  {cliente?.ativo ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              {cliente?.data_criacao && (
                <small className="text-muted">
                  Membro desde: {new Date(cliente.data_criacao).toLocaleDateString('pt-BR')}
                </small>
              )}
            </Card.Body>
          </Card>

          {/* Card de Segurança */}
          <Card>
            <Card.Header>
              <h5 className="mb-0 d-flex align-items-center">
                <FaLock className="me-2" />
                Segurança
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid">
                <Button
                  variant="primary"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <FaLock className="me-2" />
                  Alterar Senha
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal para Alteração de Senha */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaLock className="me-2" />
            Alterar Senha
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Senha Atual</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showPasswords.senhaAtual ? "text" : "password"}
                  name="senhaAtual"
                  value={passwordData.senhaAtual}
                  onChange={handlePasswordChange}
                  placeholder="Digite sua senha atual"
                  required
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-0 border-0"
                  onClick={() => togglePasswordVisibility('senhaAtual')}
                  style={{ zIndex: 5 }}
                >
                  {showPasswords.senhaAtual ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nova Senha</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showPasswords.novaSenha ? "text" : "password"}
                  name="novaSenha"
                  value={passwordData.novaSenha}
                  onChange={handlePasswordChange}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  required
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-0 border-0"
                  onClick={() => togglePasswordVisibility('novaSenha')}
                  style={{ zIndex: 5 }}
                >
                  {showPasswords.novaSenha ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirmar Nova Senha</Form.Label>
              <div className="position-relative">
                <Form.Control
                  type={showPasswords.confirmarSenha ? "text" : "password"}
                  name="confirmarSenha"
                  value={passwordData.confirmarSenha}
                  onChange={handlePasswordChange}
                  placeholder="Confirme a nova senha"
                  required
                />
                <Button
                  variant="link"
                  className="position-absolute end-0 top-0 border-0"
                  onClick={() => togglePasswordVisibility('confirmarSenha')}
                  style={{ zIndex: 5 }}
                >
                  {showPasswords.confirmarSenha ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handlePasswordSubmit}
            disabled={!passwordData.senhaAtual || !passwordData.novaSenha || !passwordData.confirmarSenha}
          >
            <FaLock className="me-2" />
            Alterar Senha
          </Button>
        </Modal.Footer>
      </Modal>
    </ComponentContainerCard>
  );
}