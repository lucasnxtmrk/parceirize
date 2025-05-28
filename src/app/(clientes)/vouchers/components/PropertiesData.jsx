"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardBody, CardFooter, Col, Row } from "react-bootstrap";
import PropertiesFilter from "./PropertiesFilter";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

const PropertiesCard = ({ voucher_codigo, voucher_desconto, parceiro_nome, parceiro_foto, parceiro_nicho }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(voucher_codigo);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  
  return (
    <Card className="overflow-hidden">
      <div className="position-relative" style={{ height: "150px", overflow: "hidden" }}>
        <Image
          src={parceiro_foto}
          alt={parceiro_nome}
          className="img-fluid rounded-top"
          width={300}
          height={200}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </div>
      <CardBody>
        <div className="d-flex align-items-center gap-2">
          <div>
            <h5 className="text-dark fw-medium">{parceiro_nome}</h5>
            <p className="text-muted mb-0">{parceiro_nicho}</p>
            <p className="fw-bold mb-0">Desconto: {voucher_desconto}%</p>
          </div>
        </div>
      </CardBody>
      <CardFooter className="bg-light-subtle d-flex justify-content-between align-items-center border-top">
        <p className="text-muted mb-0">{voucher_codigo}</p>
        <Link href="#" className="link-primary fw-medium" onClick={handleCopy}>
          {copied ? (
            <>
              Copiado <IconifyIcon icon="ri-check-line" className="align-middle" />
            </>
          ) : (
            <>
              Copiar <IconifyIcon icon="ri-file-copy-line" className="align-middle" />
            </>
          )}
        </Link>
      </CardFooter>
    </Card>
  );
};

const PropertiesData = () => {
  const [vouchers, setVouchers] = useState([]);
  const [filteredVouchers, setFilteredVouchers] = useState([]);

  // Buscar vouchers da API
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const response = await fetch("/api/vouchers");
        const data = await response.json();
        setVouchers(data);
        setFilteredVouchers(data); // Inicialmente todos os vouchers
      } catch (error) {
        console.error("Erro ao buscar vouchers:", error);
      }
    };

    fetchVouchers();
  }, []);

  // Função para aplicar filtro
  const handleFilterChange = ({ nichos, search }) => {
    let filtered = [...vouchers]; // ✅ Criamos uma cópia para evitar mutação do estado original

    if (nichos.length > 0) {
      filtered = filtered.filter(voucher => nichos.includes(voucher.parceiro_nicho));
    }

    if (search.trim() !== "") {
      filtered = filtered.filter(voucher => 
        voucher.parceiro_nome.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredVouchers(filtered);
  };

  return (
    <Row>
        <PropertiesFilter onFilterChange={handleFilterChange} />
      <Col xl={9} lg={12}>
        <Row>
          {filteredVouchers.length > 0 ? (
            filteredVouchers.map((voucher, idx) => (
              <Col lg={4} md={6} key={idx}>
                <PropertiesCard {...voucher} />
              </Col>
            ))
          ) : (
            <p className="text-center mt-4">Nenhum voucher encontrado</p>
          )}
        </Row>
      </Col>
    </Row>
  );
};

export default PropertiesData;
