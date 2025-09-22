"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardBody, Col, Row, Badge } from "react-bootstrap";
import { motion } from "framer-motion";
import PropertiesFilter from "./PropertiesFilter";
import IconifyIcon from "@/components/wrappers/IconifyIcon";
import { formatPrice } from "@/utils/formatters";
import { Nichos } from "@/data/nichos";
import { FaShoppingBag } from "react-icons/fa";
import Button from "@/components/ui/button";
import ProductCard from "@/components/ui/ProductCard";
import { CardLoading } from "@/components/ui/Loading";
import { useRouter } from "next/navigation";

// 🏪 Card de Loja/Parceiro customizado
const LojaCard = ({
  id,
  nome_empresa,
  nicho,
  foto,
  email,
  cidade,
  estado,
  cep,
  endereco,
  total_produtos,
  menor_preco,
  maior_preco,
  maior_desconto,
  index = 0
}) => {
  const router = useRouter();
  const nichoInfo = Nichos.find(n => n.id === Number(nicho));
  const hasProducts = total_produtos > 0;


  const handleViewParceiro = () => {
    router.push(`/lojas/${id}`);
  };

  const formatLocation = () => {
    if (cidade && estado) {
      return `${cidade}, ${estado}`;
    }
    if (estado) {
      return estado;
    }
    return null;
  };

  const location = formatLocation();
  const priceRange = hasProducts && menor_preco > 0 ? {
    min: formatPrice(menor_preco),
    max: maior_preco > menor_preco ? formatPrice(maior_preco) : null
  } : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="h-100"
    >
      <Card className="h-100 shadow-sm border">
        <CardBody className="p-3 d-flex flex-column">
          {/* Header com imagem pequena */}
          <div className="d-flex align-items-start mb-2">
            <div className="position-relative me-3">
              <Image
                src={foto && foto.trim() !== "" ? foto : "/assets/images/avatar.jpg"}
                alt={nome_empresa}
                width={50}
                height={50}
                className="rounded"
                style={{ objectFit: "cover" }}
              />
              {maior_desconto > 0 && (
                <Badge
                  bg="light"
                  text="dark"
                  className="position-absolute top-0 start-100 translate-middle"
                  style={{ fontSize: "0.6rem" }}
                >
                  -{maior_desconto}%
                </Badge>
              )}
            </div>

            <div className="flex-grow-1">
              <h6 className="fw-bold mb-1">{nome_empresa}</h6>

              {/* Categoria inline */}
              {nichoInfo && (
                <Badge bg="secondary" className="small me-2">
                  {nichoInfo.nome}
                </Badge>
              )}

              {/* Badge de produtos */}
              {hasProducts && (
                <Badge bg="light" text="dark" className="small">
                  {total_produtos} produtos
                </Badge>
              )}
            </div>
          </div>

          {/* Informações compactas */}
          <div className="mb-2">
            {/* Localização */}
            {location && (
              <div className="d-flex align-items-center text-muted small mb-1">
                <IconifyIcon icon="heroicons:map-pin" className="me-1" size={12} />
                {location}
              </div>
            )}

            {/* Email */}
            {email && (
              <div className="d-flex align-items-center text-muted small mb-1">
                <IconifyIcon icon="heroicons:envelope" className="me-1" size={12} />
                {email}
              </div>
            )}

            {/* Preços */}
            {priceRange && (
              <div className="d-flex align-items-center text-muted small">
                <IconifyIcon icon="heroicons:currency-dollar" className="me-1" size={12} />
                <span className="fw-bold text-dark">
                  {priceRange.max ? `${priceRange.min} - ${priceRange.max}` : priceRange.min}
                </span>
              </div>
            )}
          </div>

          {/* Spacer para manter botões alinhados */}
          <div className="flex-grow-1"></div>

          {/* Ação única */}
          <div className="d-grid">
            <Button
              variant="primary"
              size="sm"
              onClick={handleViewParceiro}
              className="d-flex align-items-center justify-content-center"
            >
              <FaShoppingBag className="me-2" size={12} />
              Ver Parceiro
            </Button>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

// 📋 Estado Vazio Melhorado
const EmptyState = ({ hasFilters }) => (
  <Col xs={12}>
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center py-5"
    >
      <div className="mb-4">
        <div className="d-inline-flex align-items-center justify-content-center mb-3" style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
          borderRadius: '50%'
        }}>
          <IconifyIcon 
            icon={hasFilters ? "heroicons:magnifying-glass" : "heroicons:building-storefront"} 
            width={32} 
            className="text-muted" 
          />
        </div>
        <h4 className="fw-bold text-dark mb-2">
          {hasFilters ? "Nenhuma loja encontrada" : "Nenhuma loja disponível"}
        </h4>
        <p className="text-muted mb-0" style={{ maxWidth: '400px', margin: '0 auto' }}>
          {hasFilters 
            ? "Tente ajustar os filtros ou buscar por outro termo"
            : "Novas lojas parceiras serão adicionadas em breve"
          }
        </p>
      </div>
    </motion.div>
  </Col>
);

// 🔄 Loading State usando componente padronizado
const LoadingStateComponent = () => (
  <CardLoading count={6} />
);


// 📋 Listagem Principal
const PropertiesData = () => {
  const [parceiros, setParceiros] = useState([]);
  const [filteredParceiros, setFilteredParceiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasFilters, setHasFilters] = useState(false);

  // Buscar parceiros da API
  useEffect(() => {
    const fetchParceiros = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/parceiros");
        const data = await response.json();
        
        setParceiros(data);
        setFilteredParceiros(data);
      } catch (error) {
        console.error("Erro ao buscar parceiros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchParceiros();
  }, []);

  // Aplicar filtro - memoizado para evitar re-renders infinitos
  const handleFilterChange = useCallback(({ nichos, search, hasDiscount, estado, cidade, hasProducts }) => {
    let filtered = [...parceiros];
    const hasActiveFilters = nichos.length > 0 || search.trim() !== "" || hasDiscount || estado || cidade || hasProducts;
    setHasFilters(hasActiveFilters);

    if (nichos.length > 0) {
      filtered = filtered.filter(parceiro =>
        nichos.includes(Number(parceiro.nicho))
      );
    }

    if (search.trim() !== "") {
      filtered = filtered.filter(parceiro =>
        parceiro.nome_empresa.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (hasDiscount) {
      filtered = filtered.filter(parceiro =>
        parceiro.maior_desconto && Number(parceiro.maior_desconto) > 0
      );
    }

    if (estado) {
      filtered = filtered.filter(parceiro =>
        parceiro.estado === estado
      );
    }

    if (cidade) {
      filtered = filtered.filter(parceiro =>
        parceiro.cidade === cidade
      );
    }

    if (hasProducts) {
      filtered = filtered.filter(parceiro =>
        parceiro.total_produtos > 0
      );
    }

    setFilteredParceiros(filtered);
  }, [parceiros]);

  return (
    <>
      <PropertiesFilter 
        onFilterChange={handleFilterChange} 
        parceiros={parceiros}
        filteredParceiros={filteredParceiros}
      />
      
      {loading ? (
        <LoadingStateComponent />
      ) : (
        <>
          
          <Row className="g-4">
            {filteredParceiros.length > 0 ? (
              filteredParceiros.map((parceiro, idx) => (
                <Col lg={3} md={4} sm={6} key={parceiro.id || idx}>
                  <LojaCard
                    {...parceiro}
                    index={idx}
                  />
                </Col>
              ))
            ) : (
              <EmptyState hasFilters={hasFilters} />
            )}
          </Row>
        </>
      )}
    </>
  );
};

export default PropertiesData;