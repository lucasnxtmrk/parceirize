"use client";

import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Modal, Form, Table, Badge, Alert, Spinner } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash } from "react-icons/fa";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco: "",
    desconto: "",
    imagem_url: "",
    ativo: true
  });
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const response = await fetch("/api/parceiro/produtos");
      if (response.ok) {
        const data = await response.json();
        setProdutos(data);
      } else {
        showAlert("Erro ao carregar produtos", "danger");
      }
    } catch (error) {
      showAlert("Erro ao carregar produtos", "danger");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.preco) {
      showAlert("Nome e preço são obrigatórios", "danger");
      return;
    }

    try {
      const url = editingProduct ? "/api/parceiro/produtos" : "/api/parceiro/produtos";
      const method = editingProduct ? "PUT" : "POST";
      
      const payload = editingProduct ? 
        { ...formData, id: editingProduct.id } : 
        formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showAlert(
          editingProduct ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!",
          "success"
        );
        setShowModal(false);
        resetForm();
        fetchProdutos();
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Erro ao salvar produto", "danger");
      }
    } catch (error) {
      showAlert("Erro ao salvar produto", "danger");
    }
  };

  const handleEdit = (produto) => {
    setEditingProduct(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || "",
      preco: produto.preco,
      desconto: produto.desconto || "",
      imagem_url: produto.imagem_url || "",
      ativo: produto.ativo
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const response = await fetch(`/api/parceiro/produtos?id=${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        showAlert("Produto excluído com sucesso!", "success");
        fetchProdutos();
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Erro ao excluir produto", "danger");
      }
    } catch (error) {
      showAlert("Erro ao excluir produto", "danger");
    }
  };

  const toggleStatus = async (produto) => {
    try {
      const response = await fetch("/api/parceiro/produtos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...produto,
          ativo: !produto.ativo
        })
      });

      if (response.ok) {
        showAlert(`Produto ${produto.ativo ? 'desativado' : 'ativado'} com sucesso!`, "success");
        fetchProdutos();
      } else {
        showAlert("Erro ao alterar status do produto", "danger");
      }
    } catch (error) {
      showAlert("Erro ao alterar status do produto", "danger");
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      preco: "",
      desconto: "",
      imagem_url: "",
      ativo: true
    });
    setEditingProduct(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Gerenciar Produtos</h2>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <FaPlus className="me-2" />
              Novo Produto
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {produtos.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-3">Nenhum produto cadastrado</p>
                  <Button variant="primary" onClick={() => setShowModal(true)}>
                    <FaPlus className="me-2" />
                    Cadastrar Primeiro Produto
                  </Button>
                </div>
              ) : (
                <Table responsive hover>
                  <thead className="table-light">
                    <tr>
                      <th>Produto</th>
                      <th>Preço</th>
                      <th>Desconto</th>
                      <th>Status</th>
                      <th>Criado em</th>
                      <th width="150">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((produto) => (
                      <tr key={produto.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            {produto.imagem_url && (
                              <img
                                src={produto.imagem_url}
                                alt={produto.nome}
                                className="me-2 rounded"
                                style={{ width: "40px", height: "40px", objectFit: "cover" }}
                              />
                            )}
                            <div>
                              <strong>{produto.nome}</strong>
                              {produto.descricao && (
                                <div className="text-muted small">{produto.descricao}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="fw-bold">{formatPrice(produto.preco)}</td>
                        <td>
                          <span className="badge bg-info">
                            {produto.desconto > 0 ? `${produto.desconto}%` : 'Sem desconto'}
                          </span>
                        </td>
                        <td>
                          <Badge bg={produto.ativo ? "success" : "secondary"}>
                            {produto.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td>{new Date(produto.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEdit(produto)}
                              title="Editar"
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant={produto.ativo ? "outline-warning" : "outline-success"}
                              size="sm"
                              onClick={() => toggleStatus(produto)}
                              title={produto.ativo ? "Desativar" : "Ativar"}
                            >
                              {produto.ativo ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(produto.id)}
                              title="Excluir"
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Produto */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome do Produto *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Pizza Margherita"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Preço *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Desconto (%)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.desconto}
                    onChange={(e) => setFormData({...formData, desconto: e.target.value})}
                    placeholder="0.00"
                  />
                  <Form.Text className="text-muted">
                    Desconto em porcentagem que será aplicado ao preço original
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Descrição</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                placeholder="Descreva o produto..."
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>URL da Imagem</Form.Label>
              <Form.Control
                type="url"
                value={formData.imagem_url}
                onChange={(e) => setFormData({...formData, imagem_url: e.target.value})}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </Form.Group>

            {editingProduct && (
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Produto ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingProduct ? "Atualizar" : "Cadastrar"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}