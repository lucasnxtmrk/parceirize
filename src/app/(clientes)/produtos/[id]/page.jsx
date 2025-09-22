"use client";

import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Badge, Alert, Spinner, CardTitle, Modal } from "react-bootstrap";
import { FaShoppingCart, FaArrowLeft, FaHeart, FaShare, FaStore, FaTag, FaMinus, FaPlus } from "react-icons/fa";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ProductCard from "@/components/shared/ProductCard";
import { Nichos } from "@/data/nichos";
import IconifyIcon from "@/components/wrappers/IconifyIcon";
import { formatPrice } from "@/utils/formatters";

export default function ProdutoDetalhePage() {
  const [produto, setProduto] = useState(null);
  const [parceiro, setParceiro] = useState(null);
  const [produtosRelacionados, setProdutosRelacionados] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [quantidade, setQuantidade] = useState(1);
  const [favorito, setFavorito] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (params.id) {
      fetchProduto();
      fetchCarrinho();
    }
  }, [params.id]);

  const fetchProduto = async () => {
    try {
      const response = await fetch(`/api/produtos/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProduto(data);

        if (data.parceiro_id) {
          fetchParceiro(data.parceiro_id);
          fetchProdutosRelacionados(data.parceiro_id, data.id);
        }
      } else {
        showAlert("Produto não encontrado", "danger");
        setTimeout(() => router.push("/lojas"), 2000);
      }
    } catch (error) {
      showAlert("Erro ao carregar dados do produto", "danger");
    } finally {
      setLoading(false);
    }
  };

  const fetchParceiro = async (parceiroId) => {
    try {
      const response = await fetch(`/api/parceiros/${parceiroId}`);
      if (response.ok) {
        const data = await response.json();
        setParceiro(data);
      }
    } catch (error) {
      console.error("Erro ao carregar parceiro:", error);
    }
  };

  const fetchProdutosRelacionados = async (parceiroId, produtoId) => {
    try {
      const response = await fetch(`/api/produtos?parceiro_id=${parceiroId}&exclude=${produtoId}&limit=4`);
      if (response.ok) {
        const data = await response.json();
        setProdutosRelacionados(data);
      }
    } catch (error) {
      console.error("Erro ao carregar produtos relacionados:", error);
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

  const adicionarAoCarrinho = async () => {
    if (!session?.user) {
      showAlert("Você precisa estar logado para adicionar produtos ao carrinho", "warning");
      return;
    }

    try {
      const response = await fetch("/api/carrinho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produto.id, quantidade })
      });

      if (response.ok) {
        showAlert(`${quantidade}x ${produto.nome} adicionado ao carrinho!`, "success");
        fetchCarrinho();
        setQuantidade(1);
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Erro ao adicionar ao carrinho", "danger");
      }
    } catch (error) {
      showAlert("Erro ao adicionar ao carrinho", "danger");
    }
  };

  const getQuantidadeNoCarrinho = () => {
    const item = carrinho.find(item => item.produto_id === produto?.id);
    return item ? item.quantidade : 0;
  };

  const totalItensCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);

  if (loading) {
    return (
      <ComponentContainerCard id="produto-loading">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </ComponentContainerCard>
    );
  }

  if (!produto) {
    return (
      <ComponentContainerCard id="produto-nao-encontrado">
        <div className="text-center py-5">
          <h4 className="text-muted">Produto não encontrado</h4>
          <Link href="/lojas">
            <Button variant="primary">Voltar às Lojas</Button>
          </Link>
        </div>
      </ComponentContainerCard>
    );
  }

  return (
    <ComponentContainerCard id="produto-detalhe">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <CardTitle as="h4" className="mb-0">
          {produto.nome}
        </CardTitle>
        <div className="d-flex gap-2">
          <Badge bg="primary" className="fs-6 px-3 py-2">
            <FaShoppingCart className="me-2" />
            {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
          </Badge>
          <Link href="/lojas">
            <Button variant="outline-secondary" size="sm">
              <FaArrowLeft className="me-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} className="mb-4">
          {alert.message}
        </Alert>
      )}

      {/* Detalhes do Produto */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Row className="mb-5">
          <Col lg={6}>
            <Card className="border-0 shadow-sm">
              <div className="position-relative">
                <Image
                  src={produto.foto && produto.foto.trim() !== "" ? produto.foto : "/assets/images/produto-placeholder.jpg"}
                  alt={produto.nome}
                  width={500}
                  height={400}
                  className="w-100 rounded-top"
                  style={{ objectFit: "cover", height: "400px" }}
                />
                {produto.desconto > 0 && (
                  <Badge
                    bg="danger"
                    className="position-absolute top-0 end-0 m-3 fs-6"
                  >
                    -{produto.desconto}%
                  </Badge>
                )}
              </div>
            </Card>
          </Col>

          <Col lg={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="mb-3">
                  <h1 className="fw-bold mb-2">{produto.nome}</h1>
                  {parceiro && (
                    <div className="d-flex align-items-center mb-3">
                      <FaStore className="text-muted me-2" />
                      <Link
                        href={`/lojas/${parceiro.id}`}
                        className="text-decoration-none"
                      >
                        <span className="text-primary fw-semibold">{parceiro.nome_empresa}</span>
                      </Link>
                      <Badge bg="light" text="dark" className="ms-2">
                        {Nichos.find(n => n.id === Number(parceiro.nicho))?.nome || "Categoria"}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    {produto.desconto > 0 ? (
                      <>
                        <span className="h3 fw-bold text-success mb-0">
                          {formatPrice(produto.preco * (1 - produto.desconto / 100))}
                        </span>
                        <span className="h5 text-muted text-decoration-line-through mb-0">
                          {formatPrice(produto.preco)}
                        </span>
                        <Badge bg="success" className="px-2 py-1">
                          {produto.desconto}% OFF
                        </Badge>
                      </>
                    ) : (
                      <span className="h3 fw-bold text-dark mb-0">
                        {formatPrice(produto.preco)}
                      </span>
                    )}
                  </div>
                </div>

                {produto.descricao && (
                  <div className="mb-4">
                    <h5 className="fw-bold mb-3">Descrição</h5>
                    <p className="text-muted">{produto.descricao}</p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="form-label fw-bold">Quantidade</label>
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center border rounded">
                      <Button
                        variant="light"
                        size="sm"
                        onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                        className="border-0"
                      >
                        <FaMinus />
                      </Button>
                      <span className="px-4 py-2 fw-bold">{quantidade}</span>
                      <Button
                        variant="light"
                        size="sm"
                        onClick={() => setQuantidade(quantidade + 1)}
                        className="border-0"
                      >
                        <FaPlus />
                      </Button>
                    </div>

                    {getQuantidadeNoCarrinho() > 0 && (
                      <Badge bg="info" className="px-3 py-2">
                        {getQuantidadeNoCarrinho()} no carrinho
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="d-grid gap-2 mb-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={adicionarAoCarrinho}
                    disabled={!session?.user}
                    className="fw-bold"
                  >
                    <FaShoppingCart className="me-2" />
                    Adicionar ao Carrinho
                  </Button>

                  {!session?.user && (
                    <small className="text-muted text-center">
                      Faça login para adicionar produtos ao carrinho
                    </small>
                  )}
                </div>

                <div className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setFavorito(!favorito)}
                    className={favorito ? "text-danger" : ""}
                  >
                    <FaHeart className={`me-2 ${favorito ? "text-danger" : ""}`} />
                    {favorito ? "Favoritado" : "Favoritar"}
                  </Button>
                  <Button variant="outline-secondary" size="sm">
                    <FaShare className="me-2" />
                    Compartilhar
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* Produtos Relacionados */}
      {produtosRelacionados.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Row className="mb-4">
            <Col>
              <h4 className="fw-bold d-flex align-items-center">
                <IconifyIcon icon="heroicons:cube" className="me-2 text-primary" width={24} />
                Outros produtos de {parceiro?.nome_empresa}
              </h4>
            </Col>
          </Row>

          <Row>
            {produtosRelacionados.map((produtoRel, index) => (
              <ProductCard
                key={produtoRel.id}
                produto={produtoRel}
                quantidadeNoCarrinho={carrinho.find(item => item.produto_id === produtoRel.id)?.quantidade || 0}
                onAdicionarAoCarrinho={() => {}}
                onAtualizarQuantidade={() => {}}
                onRemoverDoCarrinho={() => {}}
                showParceiro={false}
                index={index}
                linkToProduto={true}
              />
            ))}
          </Row>
        </motion.div>
      )}
    </ComponentContainerCard>
  );
}