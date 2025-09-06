"use client";

import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Badge, Alert, Spinner, CardTitle } from "react-bootstrap";
import { FaArrowLeft, FaEnvelope, FaShoppingCart } from "react-icons/fa";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ProductCard from "@/components/shared/ProductCard";

export default function LojaProdutosPage() {
  const [parceiro, setParceiro] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      fetchParceiro();
      fetchProdutos();
      fetchCarrinho();
    }
  }, [params.id]);

  const fetchParceiro = async () => {
    try {
      const response = await fetch(`/api/parceiros/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setParceiro(data);
      } else {
        showAlert("Parceiro não encontrado", "danger");
        setTimeout(() => router.push("/vouchers"), 2000);
      }
    } catch (error) {
      showAlert("Erro ao carregar dados do parceiro", "danger");
    }
  };

  const fetchProdutos = async () => {
    try {
      const response = await fetch(`/api/produtos?parceiro_id=${params.id}`);
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

  const fetchCarrinho = async () => {
    try {
      const response = await fetch("/api/carrinho");
      if (response.ok) {
        const data = await response.json();
        setCarrinho(data.itens || []);
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho:", error);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: "", variant: "" }), 3000);
  };

  const adicionarAoCarrinho = async (produto) => {
    try {
      const response = await fetch("/api/carrinho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produto.id, quantidade: 1 })
      });

      if (response.ok) {
        showAlert(`${produto.nome} adicionado ao carrinho!`, "success");
        fetchCarrinho();
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Erro ao adicionar ao carrinho", "danger");
      }
    } catch (error) {
      showAlert("Erro ao adicionar ao carrinho", "danger");
    }
  };

  const atualizarQuantidade = async (produtoId, novaQuantidade) => {
    if (novaQuantidade < 1) {
      removerDoCarrinho(produtoId);
      return;
    }

    try {
      const response = await fetch("/api/carrinho", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produtoId, quantidade: novaQuantidade })
      });

      if (response.ok) {
        fetchCarrinho();
      } else {
        showAlert("Erro ao atualizar quantidade", "danger");
      }
    } catch (error) {
      showAlert("Erro ao atualizar quantidade", "danger");
    }
  };

  const removerDoCarrinho = async (produtoId) => {
    try {
      const response = await fetch(`/api/carrinho?produto_id=${produtoId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        showAlert("Item removido do carrinho", "success");
        fetchCarrinho();
      } else {
        showAlert("Erro ao remover item", "danger");
      }
    } catch (error) {
      showAlert("Erro ao remover item", "danger");
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getQuantidadeNoCarrinho = (produtoId) => {
    const item = carrinho.find(item => item.produto_id === produtoId);
    return item ? item.quantidade : 0;
  };

  const totalItensCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);

  if (loading) {
    return (
      <ComponentContainerCard id="loja-produtos-loading">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </ComponentContainerCard>
    );
  }

  return (
    <ComponentContainerCard id="loja-produtos-detalhes">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <CardTitle as="h4" className="mb-0">
          {parceiro ? `${parceiro.nome}` : 'Produtos da Loja'}
        </CardTitle>
        <Link href="/loja">
          <Button variant="outline-secondary" size="sm">
            <FaArrowLeft className="me-2" />
            Voltar
          </Button>
        </Link>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      {/* Header com informações do parceiro */}
      {parceiro && (
        <Row className="mb-4">
          <Col>
            <Card className="bg-light">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <Link href="/vouchers" className="btn btn-outline-secondary btn-sm">
                    <FaArrowLeft className="me-2" />
                    Voltar às Lojas
                  </Link>
                  <Badge bg="primary" className="fs-6">
                    <FaShoppingCart className="me-2" />
                    {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
                  </Badge>
                </div>
                
                <Row className="align-items-center">
                  <Col md={2}>
                    <Image
                      src={parceiro.foto && parceiro.foto.trim() !== "" ? parceiro.foto : "/assets/images/avatar.jpg"}
                      alt={parceiro.nome_empresa}
                      className="img-fluid rounded"
                      width={100}
                      height={100}
                      style={{ objectFit: "cover" }}
                    />
                  </Col>
                  <Col md={10}>
                    <h2 className="mb-2">{parceiro.nome_empresa}</h2>
                    <Badge bg="secondary" className="mb-2">{parceiro.nicho}</Badge>
                    {parceiro.email && (
                      <p className="text-muted mb-0">
                        <FaEnvelope className="me-2" />
                        {parceiro.email}
                      </p>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {produtos.length === 0 ? (
        <Row>
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <h4 className="text-muted">Nenhum produto disponível</h4>
                <p className="text-muted">Este parceiro ainda não cadastrou produtos.</p>
                <Link href="/vouchers">
                  <Button variant="primary">Explorar Outras Lojas</Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <>
          <Row className="mb-3">
            <Col>
              <h4>Produtos Disponíveis ({produtos.length})</h4>
            </Col>
          </Row>
          
          <Row>
            {produtos.map((produto, index) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                quantidadeNoCarrinho={getQuantidadeNoCarrinho(produto.id)}
                onAdicionarAoCarrinho={adicionarAoCarrinho}
                onAtualizarQuantidade={atualizarQuantidade}
                onRemoverDoCarrinho={removerDoCarrinho}
                showParceiro={false}
                index={index}
              />
            ))}
          </Row>
        </>
      )}
    </ComponentContainerCard>
  );
}