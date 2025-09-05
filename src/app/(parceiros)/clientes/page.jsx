"use client";

import React, { useMemo, useState } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Modal, Form, FormGroup, FormLabel, FormControl } from 'react-bootstrap';

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
      <div className="d-flex justify-content-end mb-3">
        <Button onClick={open}>Importar da Integração</Button>
      </div>

      <p className="text-muted">Em breve: listagem/gestão de clientes do parceiro.</p>

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

