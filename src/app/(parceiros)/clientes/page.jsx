"use client";

import React, { useMemo, useState } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Modal, Form, FormGroup, FormLabel, FormControl, Container, Row, Col, Card } from 'react-bootstrap';

export default function ParceiroClientesPage() {
  const [show, setShow] = useState(false);
  const [senhaPadrao, setSenhaPadrao] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const open = () => { setError(null); setResult(null); setSenhaPadrao(''); setShow(true); };
  const close = () => setShow(false);

  const onImport = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await fetch('/api/parceiro/integracoes/sgp/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_padrao: senhaPadrao })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Falha ao importar');
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <ComponentContainerCard id="clientes-parceiro" title="Clientes" description="Gerencie seus clientes.">
      <Container fluid>
        <Row className="g-3">
          {/* Header com ação */}
          <Col xs={12}>
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2 mb-3">
              <div>
                <h5 className="mb-1">Seus Clientes</h5>
                <p className="text-muted mb-0 small">Gerencie e visualize todos os seus clientes</p>
              </div>
              <Button 
                onClick={open} 
                className="d-flex align-items-center gap-2"
                style={{ whiteSpace: 'nowrap' }}
              >
                <i className="bi bi-download"></i>
                <span className="d-none d-sm-inline">Importar da Integração</span>
                <span className="d-inline d-sm-none">Importar</span>
              </Button>
            </div>
          </Col>

          {/* Cards de estatísticas */}
          <Col xs={12} sm={6} lg={3}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="text-center">
                <div className="display-6 text-primary mb-2">
                  <i className="bi bi-people"></i>
                </div>
                <h4 className="mb-1">0</h4>
                <p className="text-muted mb-0 small">Total de Clientes</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} sm={6} lg={3}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="text-center">
                <div className="display-6 text-success mb-2">
                  <i className="bi bi-check-circle"></i>
                </div>
                <h4 className="mb-1">0</h4>
                <p className="text-muted mb-0 small">Ativos</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} sm={6} lg={3}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="text-center">
                <div className="display-6 text-warning mb-2">
                  <i className="bi bi-pause-circle"></i>
                </div>
                <h4 className="mb-1">0</h4>
                <p className="text-muted mb-0 small">Inativos</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xs={12} sm={6} lg={3}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="text-center">
                <div className="display-6 text-info mb-2">
                  <i className="bi bi-calendar-plus"></i>
                </div>
                <h4 className="mb-1">0</h4>
                <p className="text-muted mb-0 small">Este Mês</p>
              </Card.Body>
            </Card>
          </Col>

          {/* Área de conteúdo */}
          <Col xs={12}>
            <Card className="shadow-sm border-0">
              <Card.Body className="text-center py-5">
                <div className="display-1 text-muted mb-3">
                  <i className="bi bi-people"></i>
                </div>
                <h4 className="text-muted mb-2">Nenhum cliente encontrado</h4>
                <p className="text-muted mb-3">
                  Comece importando clientes de sua integração SGP ou aguarde a funcionalidade de listagem
                </p>
                <Button variant="primary" onClick={open} className="d-inline-flex align-items-center gap-2">
                  <i className="bi bi-download"></i>
                  Importar Clientes
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Modal show={show} onHide={close} centered>
        <Modal.Header closeButton>
          <Modal.Title>Importar da Integração</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <FormGroup className="mb-3">
              <FormLabel>Integração</FormLabel>
              <Form.Select disabled>
                <option value="SGP">SGP</option>
              </Form.Select>
            </FormGroup>
            <FormGroup className="mb-3">
              <FormLabel>Senha padrão para clientes importados</FormLabel>
              <FormControl type="text" value={senhaPadrao} onChange={(e) => setSenhaPadrao(e.target.value)} placeholder="mínimo 6 caracteres" />
            </FormGroup>
            {error && <p className="text-danger mb-0">{error}</p>}
            {result && (
              <div className="alert alert-success mt-2 mb-0">
                <div>Importação concluída.</div>
                <div>Criados: {result.criados} | Atualizados: {result.atualizados} | Processados: {result.totalProcessados}</div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={close}>Fechar</Button>
          <Button onClick={onImport} disabled={loading || !senhaPadrao}>
            {loading ? 'Importando...' : 'Importar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </ComponentContainerCard>
  );
}

