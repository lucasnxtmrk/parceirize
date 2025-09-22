"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Col, Row, Form, Badge, InputGroup } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import { Nichos } from "@/data/nichos";
import Image from "next/image";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

const PropertiesFilter = ({ onFilterChange, parceiros, filteredParceiros }) => {
  const [selectedNichos, setSelectedNichos] = useState([]);
  const [search, setSearch] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState("");
  const [selectedCidade, setSelectedCidade] = useState("");
  const [hasProducts, setHasProducts] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Obter listas únicas de estados e cidades
  const estados = [...new Set(parceiros?.filter(p => p.estado).map(p => p.estado))].sort();
  const cidadesDisponiveis = selectedEstado
    ? [...new Set(parceiros?.filter(p => p.estado === selectedEstado && p.cidade).map(p => p.cidade))].sort()
    : [...new Set(parceiros?.filter(p => p.cidade).map(p => p.cidade))].sort();

  // Memoizar o callback de filtro para evitar chamadas desnecessárias
  const handleFilter = useCallback(() => {
    if (onFilterChange) {
      onFilterChange({
        nichos: selectedNichos,
        search,
        hasDiscount,
        estado: selectedEstado,
        cidade: selectedCidade,
        hasProducts
      });
    }
  }, [selectedNichos, search, hasDiscount, selectedEstado, selectedCidade, hasProducts, onFilterChange]);

  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  const handleNichoToggle = (id) => {
    setSelectedNichos((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSelectedNichos([]);
    setSearch("");
    setHasDiscount(false);
    setSelectedEstado("");
    setSelectedCidade("");
    setHasProducts(false);
  };

  const hasActiveFilters = selectedNichos.length > 0 || search.trim() !== "" || hasDiscount || selectedEstado || selectedCidade || hasProducts;
  
  // Stats compactos
  const totalProdutos = filteredParceiros?.reduce((acc, p) => acc + (p.total_produtos || 0), 0) || 0;
  const lojasComProdutos = filteredParceiros?.filter(p => p.total_produtos > 0).length || 0;

  return (
    <Col xs={12} className="mb-3">
      <Card className="border" style={{ borderRadius: '8px' }}>
        <CardBody className="p-3">
          {/* Header compacto com stats */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-4">
              <div className="d-flex align-items-center gap-2">
                <IconifyIcon icon="heroicons:adjustments-horizontal" width={18} className="text-muted" />
                <span className="fw-semibold">Filtros</span>
              </div>
              
              {/* Stats inline */}
              <div className="d-flex gap-3 align-items-center">
                <div className="d-flex align-items-center gap-1">
                  <IconifyIcon icon="heroicons:building-storefront" className="text-muted" width={14} />
                  <span className="fw-semibold text-dark small">{filteredParceiros?.length || 0}</span>
                  <small className="text-muted">lojas</small>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <IconifyIcon icon="heroicons:cube" className="text-muted" width={14} />
                  <span className="fw-semibold text-dark small">{totalProdutos}</span>
                  <small className="text-muted">produtos</small>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <IconifyIcon icon="heroicons:check-circle" className="text-muted" width={14} />
                  <span className="fw-semibold text-dark small">{lojasComProdutos}</span>
                  <small className="text-muted">ativas</small>
                </div>
              </div>
            </div>
            
            <div className="d-flex gap-2 align-items-center">
              {hasActiveFilters && (
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={clearFilters}
                  style={{ borderRadius: '4px', fontSize: '0.8rem' }}
                >
                  Limpar
                </button>
              )}
              <button
                className="btn btn-light btn-sm"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ borderRadius: '4px' }}
              >
                <IconifyIcon 
                  icon={isExpanded ? "heroicons:chevron-up" : "heroicons:chevron-down"} 
                  width={14} 
                />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Row className="g-3">
                  {/* Primeira linha - Busca e Localização */}
                  <Col md={3}>
                    <Form.Control
                      type="text"
                      placeholder="Buscar loja..."
                      size="sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ borderRadius: '4px' }}
                    />
                  </Col>

                  <Col md={2}>
                    <Form.Select
                      size="sm"
                      value={selectedEstado}
                      onChange={(e) => {
                        setSelectedEstado(e.target.value);
                        setSelectedCidade(""); // Limpar cidade quando mudar estado
                      }}
                      style={{ borderRadius: '4px' }}
                    >
                      <option value="">Todos os estados</option>
                      {estados.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={2}>
                    <Form.Select
                      size="sm"
                      value={selectedCidade}
                      onChange={(e) => setSelectedCidade(e.target.value)}
                      style={{ borderRadius: '4px' }}
                      disabled={!selectedEstado}
                    >
                      <option value="">Todas as cidades</option>
                      {cidadesDisponiveis.map(cidade => (
                        <option key={cidade} value={cidade}>{cidade}</option>
                      ))}
                    </Form.Select>
                  </Col>

                  {/* Checkboxes */}
                  <Col md={5}>
                    <div className="d-flex gap-3 align-items-center">
                      <Form.Check
                        type="checkbox"
                        id="hasDiscount"
                        label="Com desconto"
                        checked={hasDiscount}
                        onChange={(e) => setHasDiscount(e.target.checked)}
                        className="small"
                      />
                      <Form.Check
                        type="checkbox"
                        id="hasProducts"
                        label="Com produtos"
                        checked={hasProducts}
                        onChange={(e) => setHasProducts(e.target.checked)}
                        className="small"
                      />
                    </div>
                  </Col>

                  {/* Segunda linha - Categorias */}
                  <Col xs={12}>
                    <div className="d-flex flex-wrap gap-1">
                      <small className="text-muted align-self-center me-2">Categorias:</small>
                      {Nichos.slice(0, 8).map((nicho) => {
                        const isSelected = selectedNichos.includes(nicho.id);
                        return (
                          <button
                            key={nicho.id}
                            onClick={() => handleNichoToggle(nicho.id)}
                            className={`btn btn-sm ${
                              isSelected ? 'btn-primary' : 'btn-outline-secondary'
                            }`}
                            style={{
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              padding: '2px 8px'
                            }}
                          >
                            {nicho.nome}
                          </button>
                        );
                      })}
                    </div>
                  </Col>
                </Row>

                {/* Filtros ativos compactos */}
                {hasActiveFilters && (
                  <div className="pt-2 mt-2 border-top">
                    <div className="d-flex flex-wrap gap-1 align-items-center">
                      <small className="text-muted">Filtros ativos:</small>
                      {search && (
                        <Badge bg="secondary" className="small">{search}</Badge>
                      )}
                      {selectedEstado && (
                        <Badge bg="secondary" className="small">{selectedEstado}</Badge>
                      )}
                      {selectedCidade && (
                        <Badge bg="secondary" className="small">{selectedCidade}</Badge>
                      )}
                      {hasDiscount && (
                        <Badge bg="secondary" className="small">Com desconto</Badge>
                      )}
                      {hasProducts && (
                        <Badge bg="secondary" className="small">Com produtos</Badge>
                      )}
                      {selectedNichos.map((nichoId) => {
                        const nicho = Nichos.find(n => n.id === nichoId);
                        return (
                          <Badge key={nichoId} bg="secondary" className="small">
                            {nicho?.nome}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardBody>
      </Card>
    </Col>
  );
};

export default PropertiesFilter;