"use client";

import React, { useEffect, useState } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, Form, FormControl, FormGroup, FormLabel, Row } from 'react-bootstrap';

export default function IntegracoesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const [subdominio, setSubdominio] = useState('');
  const [token, setToken] = useState('');
  const [modo, setModo] = useState('manual');

  useEffect(() => {
    const load = async () => {
      setError(null); setMsg(null); setLoading(true);
      try {
        const r = await fetch('/api/parceiro/integracoes/sgp');
        const data = await r.json();
        if (r.ok && data?.config) {
          setSubdominio(data.config.subdominio || '');
          setToken(data.config.token || '');
          setModo(data.config.modo_ativacao || 'manual');
        }
      } catch (e) { setError('Falha ao carregar configuração'); }
      setLoading(false);
    };
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null); setMsg(null);
    try {
      const r = await fetch('/api/parceiro/integracoes/sgp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdominio, token, modo_ativacao: modo }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao salvar');
      setMsg('Integração SGP salva com sucesso.');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <ComponentContainerCard id="integracoes" title="Integrações" description="Configure integrações disponíveis para sua conta.">
      {loading && <p>Carregando...</p>}
      {!loading && (
        <form onSubmit={onSubmit}>
          <Row className="g-3">
            <Col xs={12}><h5>SGP</h5></Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Subdomínio</FormLabel>
                <FormControl placeholder="ex: meuprovedor" value={subdominio} onChange={(e) => setSubdominio(e.target.value)} required />
                <small className="text-muted">Endpoint: https://{`{subdomínio}`}.sgp.net.br/api/contratos</small>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Token (Bearer)</FormLabel>
                <FormControl value={token} onChange={(e) => setToken(e.target.value)} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <FormLabel>Modo de ativação de clientes</FormLabel>
                <Form.Select value={modo} onChange={(e) => setModo(e.target.value)}>
                  <option value="manual">manual</option>
                  <option value="integracao">integracao</option>
                </Form.Select>
                <small className="text-muted">Em "integracao", o status ativo/inativo é sincronizado com o SGP.</small>
              </FormGroup>
            </Col>
            <Col xs={12}>
              <Button type="submit">Salvar</Button>
            </Col>
            {msg && <Col xs={12}><p className="text-success mb-0">{msg}</p></Col>}
            {error && <Col xs={12}><p className="text-danger mb-0">{error}</p></Col>}
          </Row>
        </form>
      )}
    </ComponentContainerCard>
  );
}

