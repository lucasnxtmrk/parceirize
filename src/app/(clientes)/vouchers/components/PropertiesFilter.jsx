"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, CardTitle, Col, Row, Form } from "react-bootstrap";
import { Nichos } from "@/data/nichos";
import Image from "next/image";

const PropertiesFilter = ({ onFilterChange }) => {
  const [selectedNichos, setSelectedNichos] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    onFilterChange({ nichos: selectedNichos, search });
  }, [selectedNichos, search]);

  const handleNichoToggle = (id) => {
    setSelectedNichos((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  return (
    <Col xl={12} className="mb-4">
      <Card>
        <CardHeader className="border-bottom">
          <CardTitle as="h4">Filtrar Parceiros</CardTitle>
          <p className="mb-0">Busque por nome ou nicho</p>
        </CardHeader>
        <CardBody>
          {/* 🔍 Campo de busca */}
          <Form.Control
            type="text"
            placeholder="Buscar parceiro..."
            className="mb-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* 🧩 Lista de Nichos com estilo tipo iFood */}
          <Row className="g-3">
            {Nichos.map((nicho) => (
              <Col xs={4} sm={3} md={2} key={nicho.id}>
                <div
                  onClick={() => handleNichoToggle(nicho.id)}
                  className={`text-center p-2 rounded border shadow-sm h-100 d-flex flex-column justify-content-center align-items-center cursor-pointer ${
    selectedNichos.includes(nicho.id)
      ? "bg-secondary text-white border-secondary"
      : "bg-light"
  } hover-effect`}
                  style={{ cursor: "pointer" }}
                >
                  <Image
  src={nicho.imagem}
  alt={nicho.nome}
  width={nicho.largura || 50} // se souber o tamanho real
  height={nicho.altura || 50}
  style={{ objectFit: "contain" }}
  quality={100}
  sizes="100px"
  unoptimized={false} // use true se quiser desativar otimização do Next
/>

                  <small className="mt-2 fw-medium">{nicho.nome}</small>
                </div>
              </Col>
            ))}
          </Row>
        </CardBody>
      </Card>
    </Col>
  );
};

export default PropertiesFilter;
