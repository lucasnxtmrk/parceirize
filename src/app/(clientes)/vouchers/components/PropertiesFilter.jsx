"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardBody, CardFooter, CardHeader, CardTitle, Col, Row } from "react-bootstrap";

const PropertiesFilter = ({ onFilterChange }) => {
  const [nichos, setNichos] = useState([]);
  const [selectedNichos, setSelectedNichos] = useState([]);
  const [search, setSearch] = useState("");

  // Buscar nichos da API
  useEffect(() => {
    const fetchNichos = async () => {
      try {
        const response = await fetch("/api/nichos");
        const data = await response.json();
        setNichos(data.map(n => n.nicho)); // Transformamos o resultado em um array de strings
      } catch (error) {
        console.error("Erro ao buscar nichos:", error);
      }
    };

    fetchNichos();
  }, []);

  // Atualizar seleção de nichos
  const handleNichoChange = (nicho) => {
    setSelectedNichos(prevSelected =>
      prevSelected.includes(nicho)
        ? prevSelected.filter(item => item !== nicho)
        : [...prevSelected, nicho]
    );
  };

  // Aplicar filtro
  const handleApplyFilter = () => {
    onFilterChange({ nichos: selectedNichos, search });
  };

  return (
    <Col xl={3} lg={12}>
      <Card>
        <CardHeader className="border-bottom">
          <CardTitle as={"h4"}>Filtrar Parceiros</CardTitle>
          <p className="mb-0">Encontre parceiros por nicho ou nome</p>
        </CardHeader>
        <CardBody>
          {/* Campo de pesquisa */}
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Pesquisar parceiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Lista de Nichos Dinâmicos */}
          <h5 className="fw-medium my-3"> Nichos Parceiros:</h5>
          <Row className="g-1">
            {nichos.map((nicho, idx) => (
              <Col lg={6} key={idx}>
                <div className="mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`nicho-${idx}`}
                    checked={selectedNichos.includes(nicho)}
                    onChange={() => handleNichoChange(nicho)}
                  />
                  &nbsp;
                  <label className="form-check-label ms-1" htmlFor={`nicho-${idx}`}>
                    {nicho}
                  </label>
                </div>
              </Col>
            ))}
          </Row>
        </CardBody>
        <CardFooter>
          <Button variant="secondary" className="w-100" onClick={handleApplyFilter}>
            Aplicar Filtro
          </Button>
        </CardFooter>
      </Card>
    </Col>
  );
};

export default PropertiesFilter;
