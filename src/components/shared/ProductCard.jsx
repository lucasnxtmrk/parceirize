"use client";

import { Card, Badge, Button, Col } from "react-bootstrap";
import { FaShoppingCart, FaPlus, FaMinus, FaStore, FaTag } from "react-icons/fa";
import { motion } from "framer-motion";

const ProductCard = ({ 
  produto, 
  quantidadeNoCarrinho, 
  onAdicionarAoCarrinho, 
  onAtualizarQuantidade, 
  onRemoverDoCarrinho,
  showParceiro = false,
  index = 0 
}) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const temDesconto = Number(produto.desconto) > 0;
  const precoOriginal = Number(produto.preco);
  const precoComDesconto = precoOriginal * (1 - Number(produto.desconto) / 100);

  return (
    <Col md={4} lg={3} key={produto.id} className="mb-3">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="h-100"
      >
        <Card className="h-100 border overflow-hidden position-relative" style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          {/* Badge de desconto no canto superior direito */}
          {temDesconto && (
            <div className="position-absolute top-0 end-0 z-3 m-2">
              <Badge bg="white" text="dark" className="px-2 py-1 shadow-sm border" style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                -{produto.desconto}%
              </Badge>
            </div>
          )}

          {/* Imagem do produto */}
          <div className="position-relative overflow-hidden">
            {produto.imagem_url ? (
              <Card.Img 
                variant="top" 
                src={produto.imagem_url} 
                style={{ 
                  height: "120px", 
                  objectFit: "cover",
                  transition: "transform 0.3s ease"
                }}
                className="hover-zoom"
              />
            ) : (
              <div 
                className="d-flex align-items-center justify-content-center bg-light"
                style={{ height: "120px" }}
              >
                <FaShoppingCart size={32} className="text-muted" />
              </div>
            )}
            
            {/* Gradient overlay para melhor legibilidade do badge */}
            <div 
              className="position-absolute top-0 end-0 w-100 h-25" 
              style={{
                background: 'linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.1) 100%)'
              }}
            />
          </div>

          <Card.Body className="d-flex flex-column p-2" style={{ minHeight: 'auto' }}>
            {/* Header do card */}
            <div className="mb-1">
              {/* Badge do parceiro (apenas no catálogo geral) */}
              {showParceiro && (
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Badge bg="light" text="muted" className="px-2 py-1 small border-0" style={{ fontSize: '0.7rem' }}>
                    {produto.parceiro_nicho}
                  </Badge>
                </div>
              )}
              
              {/* Nome do produto */}
              <h6 className="card-title mb-1 fw-semibold text-dark line-clamp-2" style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>
                {produto.nome}
              </h6>
              
              {/* Nome do parceiro (apenas no catálogo geral) */}
              {showParceiro && (
                <p className="text-muted small mb-0 fw-medium" style={{ fontSize: '0.7rem' }}>
                  {produto.parceiro_nome}
                </p>
              )}
            </div>
            
            
            {/* Seção de preço e ações */}
            <div className="mt-auto">
              {/* Preços */}
              <div className="mb-1">
                {temDesconto ? (
                  <div>
                    {/* Preço original riscado */}
                    <div className="d-flex align-items-center gap-1 mb-0">
                      <small className="text-muted text-decoration-line-through" style={{ fontSize: '0.7rem' }}>
                        De: {formatPrice(precoOriginal)}
                      </small>
                    </div>
                    {/* Preço com desconto destacado */}
                    <div className="d-flex align-items-center justify-content-between">
                      <span className="h6 mb-0 text-dark fw-bold">
                        {formatPrice(precoComDesconto)}
                      </span>
                      <small className="text-muted fw-medium" style={{ fontSize: '0.7rem' }}>
                        -{produto.desconto}%
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="h6 mb-0 text-dark fw-bold">
                      {formatPrice(precoOriginal)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Botões de ação */}
              {quantidadeNoCarrinho > 0 ? (
                <div className="d-flex align-items-center justify-content-between gap-2">
                  {/* Controles de quantidade */}
                  <div className="d-flex align-items-center gap-2">
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      className="d-flex align-items-center justify-content-center"
                      style={{ width: '32px', height: '32px', fontSize: '0.8rem', minWidth: '32px', color: '#6c757d' }}
                      onClick={() => onAtualizarQuantidade(produto.id, quantidadeNoCarrinho - 1)}
                    >
                      <FaMinus size={14} />
                    </Button>
                    <span className="fw-bold mx-1 text-center" style={{ minWidth: '20px', fontSize: '0.9rem' }}>
                      {quantidadeNoCarrinho}
                    </span>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      className="d-flex align-items-center justify-content-center"
                      style={{ width: '32px', height: '32px', fontSize: '0.8rem', minWidth: '32px', color: '#6c757d' }}
                      onClick={() => onAtualizarQuantidade(produto.id, quantidadeNoCarrinho + 1)}
                    >
                      <FaPlus size={14} />
                    </Button>
                  </div>
                  
                  {/* Botão remover */}
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => onRemoverDoCarrinho(produto.id)}
                    className="flex-grow-1"
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="dark"
                  className="w-100 fw-medium"
                  onClick={() => onAdicionarAoCarrinho(produto)}
                  style={{ 
                    borderRadius: '4px',
                    padding: '6px 10px',
                    fontSize: '0.85rem',
                    backgroundColor: '#212529',
                    borderColor: '#212529',
                    color: 'white'
                  }}
                >
                  <FaShoppingCart className="me-1" size={16} />
                  {temDesconto ? `Aproveitar Oferta` : 'Adicionar ao Carrinho'}
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      </motion.div>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .hover-zoom:hover {
          transform: scale(1.02);
        }
        .card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
          transition: all 0.2s ease;
        }
        button svg {
          color: inherit !important;
          fill: currentColor !important;
        }
      `}</style>
    </Col>
  );
};

export default ProductCard;