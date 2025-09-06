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
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoizar o callback de filtro para evitar chamadas desnecessárias
  const handleFilter = useCallback(() => {
    if (onFilterChange) {
      onFilterChange({ nichos: selectedNichos, search, hasDiscount });
    }
  }, [selectedNichos, search, hasDiscount, onFilterChange]);

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
  };

  const hasActiveFilters = selectedNichos.length > 0 || search.trim() !== "" || hasDiscount;
  
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
                  {/* Campo de busca compacto */}
                  <Col md={4}>
                    <Form.Control
                      type="text"
                      placeholder="Buscar loja..."
                      size="sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ borderRadius: '4px' }}
                    />
                  </Col>
                  
                  {/* Filtro de desconto */}
                  <Col md={3}>
                    <Form.Check
                      type="checkbox"
                      id="hasDiscount"
                      label="Com desconto"
                      checked={hasDiscount}
                      onChange={(e) => setHasDiscount(e.target.checked)}
                      className="small"
                    />
                  </Col>
                  
                  {/* Categorias compactas */}
                  <Col md={5}>
                    <div className="d-flex flex-wrap gap-1">
                      {Nichos.slice(0, 6).map((nicho) => {
                        const isSelected = selectedNichos.includes(nicho.id);
                        return (
                          <button
                            key={nicho.id}
                            onClick={() => handleNichoToggle(nicho.id)}
                            className={`btn btn-sm ${
                              isSelected ? 'btn-dark' : 'btn-outline-secondary'
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
                      <small className="text-muted">Ativos:</small>
                      {search && (
                        <Badge bg="secondary" className="small">{search}</Badge>
                      )}
                      {hasDiscount && (
                        <Badge bg="secondary" className="small">Com desconto</Badge>
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