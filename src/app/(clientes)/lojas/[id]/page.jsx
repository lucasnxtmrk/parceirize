"use client";

import { useState, useEffect } from "react";
import { Row, Col, Card, Button, Badge, Alert, Spinner, CardTitle, Modal } from "react-bootstrap";
import { FaShoppingCart, FaArrowLeft, FaEnvelope, FaTicketAlt, FaGift, FaMapMarkerAlt, FaPhone } from "react-icons/fa";
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

export default function LojaProdutosPage() {
  const [parceiro, setParceiro] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [mensagemVoucher, setMensagemVoucher] = useState("");
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (params.id) {
      fetchParceiro();
      fetchProdutos();
      fetchCarrinho();
      fetchVoucher();
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
        setTimeout(() => router.push("/lojas"), 2000);
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

  const fetchVoucher = async () => {
    try {
      const response = await fetch(`/api/vouchers/cliente?parceiro_id=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setVoucher(data); // data já é um objeto único, não array
      } else if (response.status === 400) {
        // parceiro_id obrigatório - erro na API
        console.error("Erro na API de vouchers");
      } else {
        // Outros erros
        console.error("Erro ao buscar voucher");
      }
    } catch (error) {
      console.error("Erro ao carregar voucher:", error);
    }
  };

  const solicitarVoucher = async () => {
    if (!session?.user) {
      showAlert("Você precisa estar logado para solicitar vouchers", "warning");
      return;
    }

    setVoucherLoading(true);
    try {
      const response = await fetch("/api/voucher/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parceiro_id: params.id,
          mensagem_cliente: mensagemVoucher.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("Solicitação enviada com sucesso! Aguarde a aprovação do parceiro.", "success");
        setShowVoucherModal(false);
        setMensagemVoucher("");
      } else {
        if (data.codigo === "SOLICITACAO_PENDENTE") {
          showAlert("Você já tem uma solicitação pendente para este parceiro", "warning");
        } else if (data.codigo === "VOUCHER_NAO_CONFIGURADO") {
          showAlert("Este parceiro ainda não configurou seu voucher exclusivo", "info");
        } else {
          showAlert(data.error || "Erro ao solicitar voucher", "danger");
        }
      }
    } catch (error) {
      showAlert("Erro ao solicitar voucher", "danger");
    } finally {
      setVoucherLoading(false);
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
      <ComponentContainerCard id="loja-parceira-loading">
        <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </ComponentContainerCard>
    );
  }

  return (
    <ComponentContainerCard id="loja-parceira">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <CardTitle as="h4" className="mb-0">
          {parceiro ? `${parceiro.nome_empresa}` : 'Loja Parceira'}
        </CardTitle>
        <Link href="/lojas">
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Row className="mb-4">
            <Col>
              <Card className="border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <Link href="/lojas" className="btn btn-light btn-sm d-flex align-items-center">
                      <FaArrowLeft className="me-2" />
                      Voltar às Lojas
                    </Link>
                    <Badge bg="primary" className="fs-6 px-3 py-2">
                      <FaShoppingCart className="me-2" />
                      {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>

                  <Row className="align-items-center">
                    <Col md={3} className="text-center">
                      <div className="position-relative d-inline-block">
                        <Image
                          src={parceiro.foto && parceiro.foto.trim() !== "" ? parceiro.foto : "/assets/images/avatar.jpg"}
                          alt={parceiro.nome_empresa}
                          className="rounded-circle shadow"
                          width={120}
                          height={120}
                          style={{ objectFit: "cover" }}
                        />
                        <Badge
                          bg="success"
                          className="position-absolute bottom-0 end-0 rounded-pill"
                          style={{ transform: 'translate(25%, 25%)' }}
                        >
                          <IconifyIcon icon="heroicons:check" width={12} />
                        </Badge>
                      </div>
                    </Col>
                    <Col md={9}>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h2 className="fw-bold mb-2 text-dark">{parceiro.nome_empresa}</h2>
                          <Badge bg="light" text="dark" className="px-3 py-2 me-2">
                            <IconifyIcon icon="heroicons:tag" className="me-1" width={14} />
                            {Nichos.find(n => n.id === Number(parceiro.nicho))?.nome || "Categoria"}
                          </Badge>
                          {voucher && (
                            <Badge bg="success" className="px-3 py-2">
                              <FaTicketAlt className="me-1" />
                              Voucher disponível
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Row className="text-muted small mb-3">
                        {parceiro.email && (
                          <Col md={6}>
                            <div className="d-flex align-items-center mb-2">
                              <FaEnvelope className="me-2 text-primary" />
                              <span>{parceiro.email}</span>
                            </div>
                          </Col>
                        )}
                        {parceiro.telefone && (
                          <Col md={6}>
                            <div className="d-flex align-items-center mb-2">
                              <FaPhone className="me-2 text-primary" />
                              <span>{parceiro.telefone}</span>
                            </div>
                          </Col>
                        )}
                        {(parceiro.cidade || parceiro.estado) && (
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <FaMapMarkerAlt className="me-2 text-primary" />
                              <span>
                                {parceiro.cidade && parceiro.estado
                                  ? `${parceiro.cidade}, ${parceiro.estado}`
                                  : parceiro.cidade || parceiro.estado}
                              </span>
                            </div>
                          </Col>
                        )}
                      </Row>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </motion.div>
      )}

      {/* Seção de Vouchers */}
      {parceiro && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Row className="mb-4">
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="fw-bold mb-0 d-flex align-items-center">
                      <FaGift className="me-2 text-warning" />
                      Vouchers e Descontos
                    </h4>
                  </div>

                  {voucher ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="border-warning">
                        <Card.Body>
                          <Row className="align-items-center">
                            <Col md={3} className="text-center">
                              <div className="mb-3">
                                <div className="bg-warning text-dark rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                  <span className="fw-bold fs-4">
                                    {voucher.tipo_desconto === 'percentual'
                                      ? `${voucher.valor_desconto}%`
                                      : `R$ ${voucher.valor_desconto}`
                                    }
                                  </span>
                                </div>
                              </div>
                              <Badge bg="light" text="dark" className="font-monospace">
                                {voucher.codigo}
                              </Badge>
                            </Col>
                            <Col md={6}>
                              <h5 className="fw-bold mb-2">{voucher.titulo || 'Desconto Exclusivo'}</h5>
                              <p className="text-muted mb-2">
                                Desconto de {voucher.tipo_desconto === 'percentual'
                                  ? `${voucher.valor_desconto}%`
                                  : `R$ ${voucher.valor_desconto}`} especial para clientes
                              </p>
                              {voucher.condicoes && (
                                <div>
                                  <small className="text-muted fw-bold">Condições:</small>
                                  <p className="small text-muted mb-0">{voucher.condicoes}</p>
                                </div>
                              )}
                            </Col>
                            <Col md={3} className="text-center">
                              <Button
                                variant="primary"
                                size="lg"
                                onClick={() => setShowVoucherModal(true)}
                                disabled={!session?.user}
                                className="fw-bold"
                              >
                                <FaTicketAlt className="me-2" />
                                Solicitar Este Voucher
                              </Button>
                              {!session?.user && (
                                <small className="text-muted d-block mt-2">
                                  Faça login para solicitar
                                </small>
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  ) : (
                    <div className="text-center py-5">
                      <div className="text-muted mb-3">
                        <FaTicketAlt size={60} />
                      </div>
                      <h5 className="text-muted">Nenhum voucher configurado</h5>
                      <p className="text-muted mb-3">Este parceiro ainda não configurou seu voucher exclusivo</p>
                      <small className="text-muted">
                        Entre em contato diretamente com o parceiro para saber sobre ofertas especiais
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </motion.div>
      )}

      {/* Seção de Produtos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {produtos.length === 0 ? (
          <Row>
            <Col>
              <Card className="border-0 shadow-sm text-center py-5">
                <Card.Body>
                  <div className="text-muted mb-3">
                    <IconifyIcon icon="heroicons:cube" width={60} />
                  </div>
                  <h4 className="text-muted">Nenhum produto disponível</h4>
                  <p className="text-muted">Este parceiro ainda não cadastrou produtos.</p>
                  <div className="d-flex gap-2 justify-content-center">
                    <Link href="/lojas">
                      <Button variant="primary">Explorar Outras Lojas</Button>
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : (
          <>
            <Row className="mb-3">
              <Col>
                <h4 className="fw-bold d-flex align-items-center">
                  <IconifyIcon icon="heroicons:cube" className="me-2 text-primary" width={24} />
                  Produtos Disponíveis ({produtos.length})
                </h4>
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
      </motion.div>

      {/* Modal de Solicitação de Voucher */}
      <Modal show={showVoucherModal} onHide={() => setShowVoucherModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <FaTicketAlt className="me-2 text-primary" />
            Solicitar Voucher
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {parceiro && (
            <div className="mb-3">
              <div className="d-flex align-items-center mb-3">
                <Image
                  src={parceiro.foto && parceiro.foto.trim() !== "" ? parceiro.foto : "/assets/images/avatar.jpg"}
                  alt={parceiro.nome_empresa}
                  className="rounded-circle me-3"
                  width={50}
                  height={50}
                  style={{ objectFit: "cover" }}
                />
                <div>
                  <h6 className="mb-0">{parceiro.nome_empresa}</h6>
                  <small className="text-muted">
                    {Nichos.find(n => n.id === Number(parceiro.nicho))?.nome || "Categoria"}
                  </small>
                </div>
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Mensagem (opcional)</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Deixe uma mensagem para o parceiro sobre sua solicitação..."
              value={mensagemVoucher}
              onChange={(e) => setMensagemVoucher(e.target.value)}
              maxLength={500}
            />
            <small className="text-muted">{mensagemVoucher.length}/500 caracteres</small>
          </div>

          <Alert variant="info" className="small">
            <IconifyIcon icon="heroicons:information-circle" className="me-1" />
            Sua solicitação será enviada ao parceiro para análise. Você receberá uma resposta em breve.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowVoucherModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={solicitarVoucher}
            disabled={voucherLoading}
          >
            {voucherLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Enviando...
              </>
            ) : (
              <>
                <FaTicketAlt className="me-2" />
                Enviar Solicitação
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </ComponentContainerCard>
  );
}