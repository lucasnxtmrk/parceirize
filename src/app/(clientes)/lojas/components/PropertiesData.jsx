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

// 🏪 Card de Loja/Parceiro usando ProductCard genérico
const LojaCard = ({
  id,
  nome_empresa,
  nicho,
  foto,
  email,
  total_produtos,
  menor_preco,
  maior_preco,
  maior_desconto,
  index = 0
}) => {
  const router = useRouter();
  const nichoInfo = Nichos.find(n => n.id === Number(nicho));
  const hasProducts = total_produtos > 0;
  
  const handleViewProducts = () => {
    router.push(`/lojas/${id}`);
  };

  // Preparar dados para o ProductCard genérico
  const priceRange = hasProducts && menor_preco > 0 ? {
    min: formatPrice(menor_preco),
    max: maior_preco > menor_preco ? formatPrice(maior_preco) : null
  } : null;

  const badges = [
    // Badge de produtos
    ...(hasProducts ? [{
      label: total_produtos,
      variant: 'white',
      icon: 'heroicons:cube',
      position: 'top-0 end-0'
    }] : [])
  ];

  const category = nichoInfo ? {
    name: nichoInfo.nome,
    icon: nichoInfo.icone
  } : { name: "Categoria" };

  return (
    <ProductCard
      id={id}
      title={nome_empresa}
      subtitle={email ? `📧 ${email}` : null}
      image={foto && foto.trim() !== "" ? foto : "/assets/images/avatar.jpg"}
      category={category}
      priceRange={priceRange}
      discount={maior_desconto}
      badges={badges}
      status={hasProducts ? 'available' : 'coming_soon'}
      onAction={hasProducts ? handleViewProducts : null}
      actionLabel={hasProducts ? "Ver Produtos" : "Em breve"}
      actionIcon={hasProducts ? FaShoppingBag : null}
      index={index}
      className="loja-card"
    />
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
  const handleFilterChange = useCallback(({ nichos, search, hasDiscount }) => {
    let filtered = [...parceiros];
    const hasActiveFilters = nichos.length > 0 || search.trim() !== "" || hasDiscount;
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