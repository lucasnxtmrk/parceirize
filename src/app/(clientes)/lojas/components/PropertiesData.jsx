"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardBody, CardFooter, Col, Row } from "react-bootstrap";
import { motion } from "framer-motion";
import PropertiesFilter from "./PropertiesFilter";
import IconifyIcon from "@/components/wrappers/IconifyIcon";
import { StoreCardSkeleton } from "@/components/shared/LoadingSkeleton";
import { useApi } from "@/hooks/useApi";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationContainer from "@/components/shared/NotificationContainer";
import { formatPrice } from "@/utils/formatters";
import { Nichos } from "@/data/nichos";

// 🏪 Card de Loja/Parceiro com animações
const LojaCard = ({
  id,
  nome_empresa,
  nicho,
  foto,
  email,
  total_produtos,
  menor_preco,
  maior_preco,
  index = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut" 
      }}
      whileHover={{ 
        y: -5,
        transition: { duration: 0.2 }
      }}
    >
      <Card className="overflow-hidden h-100 shadow-sm">
        <div className="position-relative" style={{ height: "150px", overflow: "hidden" }}>
          <Image
            src={foto && foto.trim() !== "" ? foto : "/assets/images/avatar.jpg"}
            alt={nome_empresa}
            className="img-fluid rounded-top"
            width={300}
            height={200}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
          />
          {total_produtos > 0 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: (index * 0.1) + 0.3 }}
              className="position-absolute top-0 end-0 m-2"
            >
              <span className="badge bg-primary">{total_produtos} produtos</span>
            </motion.div>
          )}
        </div>
        <CardBody className="d-flex flex-column">
          <div className="flex-grow-1">
            <h5 className="fw-medium mb-2">{nome_empresa}</h5>
            <p className="text-muted mb-2">{nicho}</p>
            {email && (
              <p className="text-muted mb-2 small">
                <IconifyIcon icon="ri-mail-line" className="me-1" />
                {email}
              </p>
            )}
            {total_produtos > 0 && menor_preco > 0 && (
              <p className="fw-bold mb-0 text-success">
                A partir de {formatPrice(menor_preco)}
              </p>
            )}
          </div>
        </CardBody>
        <CardFooter className="bg-light-subtle d-flex justify-content-center align-items-center border-top">
          {total_produtos > 0 ? (
            <Link href={`/lojas/${id}`} className="btn btn-primary btn-sm">
              <IconifyIcon icon="ri-shopping-bag-line" className="me-2" />
              Ver Produtos
            </Link>
          ) : (
            <span className="text-muted small">Sem produtos disponíveis</span>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

// 📋 Listagem de Lojas/Parceiros com Filtro
const PropertiesData = () => {
  const [parceiros, setParceiros] = useState([]);
  const [filteredParceiros, setFilteredParceiros] = useState([]);

  // Buscar parceiros da API
  useEffect(() => {
    const fetchParceiros = async () => {
      try {
        const response = await fetch("/api/parceiros");
        const data = await response.json();
        setParceiros(data);
        setFilteredParceiros(data);
      } catch (error) {
        console.error("Erro ao buscar parceiros:", error);
      }
    };

    fetchParceiros();
  }, []);

  // Aplicar filtro de nicho e busca
  const handleFilterChange = ({ nichos, search }) => {
    let filtered = [...parceiros];

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

    setFilteredParceiros(filtered);
  };

  return (
    <Row>
      <PropertiesFilter onFilterChange={handleFilterChange} />
      <Col xl={9} lg={12}>
        <Row>
          {filteredParceiros.length > 0 ? (
            filteredParceiros.map((parceiro, idx) => (
              <Col lg={4} md={6} key={idx} className="mb-4">
                <LojaCard
                  {...parceiro}
                  nicho={
                    Nichos.find(n => n.id === Number(parceiro.nicho))?.nome || "Categoria"
                  }
                />
              </Col>
            ))
          ) : (
            <p className="text-center mt-4">Nenhuma loja encontrada</p>
          )}
        </Row>
      </Col>
    </Row>
  );
};

export default PropertiesData;
