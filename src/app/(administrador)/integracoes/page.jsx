"use client";

import React, { useEffect, useState } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Button, Col, Form, FormControl, FormGroup, FormLabel, Row, Modal, Card, Container, Badge } from 'react-bootstrap';

export default function IntegracoesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [config, setConfig] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [cronStatus, setCronStatus] = useState({ running: false, lastRun: null, nextRun: null });
  const [cronLoading, setCronLoading] = useState(false);

  // Estados para importação com filtros
  const [importLoading, setImportLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [subdominio, setSubdominio] = useState('');
  const [token, setToken] = useState('');
  const [appName, setAppName] = useState('');
  const [cpfCentral, setCpfCentral] = useState('');
  const [senhaCentral, setSenhaCentral] = useState('');
  const [modo, setModo] = useState('manual');

  // Estados dos filtros de importação
  const [filtros, setFiltros] = useState({
    apenas_ativos: true,
    dias_atividade: 90,
    data_cadastro_inicio: '',
    data_cadastro_fim: ''
  });
  const [senhaPadrao, setSenhaPadrao] = useState('');

  useEffect(() => {
    const load = async () => {
      setError(null); setMsg(null); setLoading(true);
      try {
        const [configRes, cronRes] = await Promise.all([
          fetch('/api/admin/integracoes/sgp'),
          fetch('/api/admin/sync-cron')
        ]);
        
        const configData = await configRes.json();
        if (configRes.ok && configData?.config) {
          setConfig(configData.config);
          setLastSync(configData.lastSync);
          setSubdominio(configData.config.subdominio || '');
          setToken(configData.config.token || '');
          setAppName(configData.config.app_name || '');
          setCpfCentral(configData.config.cpf_central || '');
          setSenhaCentral(configData.config.senha_central || '');
          setModo(configData.config.modo_ativacao || 'manual');

        }
        
        const cronData = await cronRes.json();
        if (cronRes.ok) {
          setCronStatus(cronData);
        }
      } catch (e) { setError('Falha ao carregar configuração'); }
      setLoading(false);
    };
    load();
  }, []);

  const openModal = () => {
    setShowModal(true);
    setError(null);
    setMsg(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setError(null);
    setMsg(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null); setMsg(null);
    try {
      const r = await fetch('/api/admin/integracoes/sgp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdominio,
          token,
          app_name: appName,
          cpf_central: cpfCentral,
          senha_central: senhaCentral,
          modo_ativacao: modo
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao salvar');
      setMsg('Integração SGP salva com sucesso.');
      setConfig(data.config);
      setTimeout(() => {
        closeModal();
        setMsg(null);
      }, 2000);
    } catch (e) {
      setError(e.message);
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Nunca sincronizado';
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCronAction = async (action) => {
    setCronLoading(true);
    try {
      const response = await fetch('/api/admin/sync-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      if (response.ok) {
        setCronStatus(data.status);
        if (action === 'run_now') {
          // Recarregar dados da sincronização
          const configRes = await fetch('/api/admin/integracoes/sgp');
          const configData = await configRes.json();
          if (configRes.ok) {
            setLastSync(configData.lastSync);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao controlar cron:', error);
    } finally {
      setCronLoading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setError(null);
    setMsg(null);
    try {
      const response = await fetch('/api/admin/integracoes/sgp/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filtros })
      });

      const data = await response.json();
      if (response.ok) {
        setPreviewData(data.preview);
      } else {
        throw new Error(data.error || 'Erro ao gerar preview');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!senhaPadrao || senhaPadrao.length < 6) {
      setError('Senha padrão deve ter pelo menos 6 caracteres');
      return;
    }

    setImportLoading(true);
    setError(null);
    setMsg(null);
    try {
      const response = await fetch('/api/admin/integracoes/sgp/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senha_padrao: senhaPadrao,
          filtros
        })
      });

      let data;
      try {
        const text = await response.text();
        console.log('📥 Resposta do servidor:', text.substring(0, 500));
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error('❌ Erro ao parsear JSON:', jsonError);
        console.error('📄 Status da resposta:', response.status);
        console.error('📋 Headers:', response.headers);
        throw new Error(`Erro na resposta do servidor: ${jsonError.message}`);
      }

      if (response.ok) {
        const { criados, atualizados, totalProcessados, filtradosAtividade, filtradosData } = data;
        setMsg(`Importação concluída! ${criados} criados, ${atualizados} atualizados de ${totalProcessados} processados.`);
        setShowImportModal(false);
        setPreviewData(null);
        setSenhaPadrao('');

        // Recarregar configuração
        const configRes = await fetch('/api/admin/integracoes/sgp');
        const configData = await configRes.json();
        if (configRes.ok) {
          setLastSync(configData.lastSync);
        }
      } else {
        throw new Error(data.error || 'Erro na importação');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setImportLoading(false);
    }
  };

  const openImportModal = () => {
    setShowImportModal(true);
    setError(null);
    setMsg(null);
    setPreviewData(null);
  };

  return (
    <ComponentContainerCard id="integracoes" title="Integrações" description="Configure integrações disponíveis para importar clientes.">
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary mb-2" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="text-muted mb-0">Carregando integrações...</p>
        </div>
      )}
      
      {!loading && (
        <Container fluid>
          {/* Status da Sincronização Automática */}
          {config && config.modo_ativacao === 'integracao' && (
            <Row className="mb-4">
              <Col xs={12}>
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-light border-0 py-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-clock-history text-primary"></i>
                        Sincronização Automática (SGP)
                      </h6>
                      <Badge bg={cronStatus.running ? 'success' : 'secondary'}>
                        {cronStatus.running ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                  <div className="card-body py-3">
                    <Row className="align-items-center">
                      <Col md={8}>
                        <div className="d-flex flex-column gap-1">
                          <div className="d-flex align-items-center gap-3 text-sm">
                            <span>
                              <strong>Última sincronização:</strong> {formatLastSync(lastSync)}
                            </span>
                            {cronStatus.nextRun && (
                              <span className="text-muted">
                                <strong>Próxima:</strong> {formatLastSync(cronStatus.nextRun)}
                              </span>
                            )}
                          </div>
                          <small className="text-muted">
                            Sincronização automática a cada 8 horas para atualizar status dos clientes
                          </small>
                        </div>
                      </Col>
                      <Col md={4} className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleCronAction('run_now')}
                            disabled={cronLoading}
                            className="d-inline-flex align-items-center gap-1"
                          >
                            {cronLoading ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <i className="bi bi-arrow-clockwise"></i>
                            )}
                            Sincronizar Agora
                          </Button>
                          <Button
                            variant={cronStatus.running ? "outline-danger" : "outline-success"}
                            size="sm"
                            onClick={() => handleCronAction(cronStatus.running ? 'stop' : 'start')}
                            disabled={cronLoading}
                            className="d-inline-flex align-items-center gap-1"
                          >
                            <i className={`bi ${cronStatus.running ? 'bi-stop-circle' : 'bi-play-circle'}`}></i>
                            {cronStatus.running ? 'Parar' : 'Iniciar'}
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>
            </Row>
          )}

          <Row className="g-4">
            {/* Card SGP */}
            <Col xs={12} sm={6} md={4} lg={3}>
              <Card
                className="h-100 shadow-sm border-0 integration-card"
                style={{ transition: 'all 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <Card.Body className="text-center p-4">
                  <div className="display-4 text-primary mb-3">
                    <i className="bi bi-router"></i>
                  </div>
                  <h5 className="mb-2">SGP</h5>
                  <p className="text-muted small mb-3">Sistema de Gestão de Provedores</p>
                  
                  {config ? (
                    <Badge bg="success" className="mb-2">
                      <i className="bi bi-check-circle me-1"></i>
                      Configurado
                    </Badge>
                  ) : (
                    <Badge bg="secondary" className="mb-2">
                      <i className="bi bi-gear me-1"></i>
                      Não configurado
                    </Badge>
                  )}
                  
                  {config && (
                    <div className="mt-2">
                      <small className="text-muted d-block">
                        Última sincronização:
                      </small>
                      <small className="text-primary">
                        {formatLastSync(lastSync)}
                      </small>
                    </div>
                  )}
                  
                  <div className="mt-3 d-flex gap-2 justify-content-center">
                    <Button
                      variant={config ? "outline-primary" : "primary"}
                      size="sm"
                      className="d-inline-flex align-items-center gap-1"
                      onClick={(e) => { e.stopPropagation(); openModal(); }}
                    >
                      <i className={`bi ${config ? 'bi-pencil' : 'bi-plus-circle'}`}></i>
                      {config ? 'Editar' : 'Configurar'}
                    </Button>
                    {config && (
                      <Button
                        variant="success"
                        size="sm"
                        className="d-inline-flex align-items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); openImportModal(); }}
                      >
                        <i className="bi bi-download"></i>
                        Importar
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Placeholder para futuras integrações */}
            <Col xs={12} sm={6} md={4} lg={3}>
              <Card 
                className="h-100 shadow-sm border-0 text-center"
                style={{ 
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  borderColor: '#dee2e6',
                  backgroundColor: '#f8f9fa'
                }}
              >
                <Card.Body className="d-flex flex-column justify-content-center align-items-center p-4 text-muted">
                  <div className="display-4 mb-3">
                    <i className="bi bi-plus-circle"></i>
                  </div>
                  <h6 className="mb-2">Mais integrações</h6>
                  <p className="small mb-0">Em breve</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      )}

      {/* Modal SGP */}
      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="bi bi-router text-primary"></i>
            Configurar Integração SGP
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <Form onSubmit={onSubmit}>
            <Row className="g-3">
              <Col xs={12}>
                <div className="alert alert-info d-flex align-items-start gap-2">
                  <i className="bi bi-info-circle-fill"></i>
                  <div>
                    <strong>Sobre a integração:</strong><br />
                    <small>Conecte-se ao SGP para importar e sincronizar clientes de seu provedor automaticamente.</small>
                  </div>
                </div>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Subdomínio *</FormLabel>
                  <FormControl 
                    placeholder="ex: meuprovedor" 
                    value={subdominio} 
                    onChange={(e) => setSubdominio(e.target.value)} 
                    required 
                  />
                  <small className="text-muted">Endpoint: https://{subdominio || '{subdomínio}'}.sgp.net.br/api/ura/clientes/</small>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Modo de ativação</FormLabel>
                  <Form.Select value={modo} onChange={(e) => setModo(e.target.value)}>
                    <option value="manual">Manual</option>
                    <option value="integracao">Automático (Integração)</option>
                  </Form.Select>
                  <small className="text-muted">
                    {modo === 'integracao' ? 'Status sincronizado automaticamente a cada 8h' : 'Controle manual do status'}
                  </small>
                </FormGroup>
              </Col>

              <Col xs={12}>
                <hr className="my-3" />
                <h6 className="text-primary mb-3">
                  <i className="bi bi-key me-2"></i>
                  Credenciais de Autenticação
                </h6>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Token *</FormLabel>
                  <FormControl 
                    value={token} 
                    onChange={(e) => setToken(e.target.value)} 
                    required 
                    placeholder="Insira o token do SGP"
                  />
                  <small className="text-muted">Sistema → Ferramentas → Painel Admin → Tokens</small>
                </FormGroup>
              </Col>

              <Col md={6}>
                <FormGroup>
                  <FormLabel>Nome da Aplicação *</FormLabel>
                  <FormControl 
                    placeholder="ex: parceirize" 
                    value={appName} 
                    onChange={(e) => setAppName(e.target.value)} 
                    required 
                  />
                  <small className="text-muted">Sistema → Usuários</small>
                </FormGroup>
              </Col>


              {msg && (
                <Col xs={12}>
                  <div className="alert alert-success d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill"></i>
                    {msg}
                  </div>
                </Col>
              )}

              {error && (
                <Col xs={12}>
                  <div className="alert alert-danger d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    {error}
                  </div>
                </Col>
              )}
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={closeModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSubmit} className="d-inline-flex align-items-center gap-2">
            <i className="bi bi-check-circle"></i>
            Salvar Configuração
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Importação com Filtros */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} centered size="xl">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center gap-2">
            <i className="bi bi-download text-success"></i>
            Importar Clientes do SGP
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <Row className="g-4">
            {/* Coluna de Filtros */}
            <Col md={6}>
              <div className="border rounded p-3 h-100">
                <h6 className="text-primary mb-3">
                  <i className="bi bi-funnel me-2"></i>
                  Filtros de Importação
                </h6>

                <Form>
                  <Row className="g-3">
                    <Col xs={12}>
                      <div className="border rounded p-3 bg-light">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <Form.Check
                            type="checkbox"
                            label="Apenas clientes com contratos ativos"
                            checked={filtros.apenas_ativos}
                            onChange={(e) => setFiltros(prev => ({ ...prev, apenas_ativos: e.target.checked }))}
                          />
                          <i className="bi bi-info-circle text-primary"
                             title="Importa apenas clientes que possuem pelo menos um contrato ativo no SGP"
                             style={{cursor: 'help'}}></i>
                        </div>
                        <small className="text-muted">
                          <i className="bi bi-lightbulb me-1"></i>
                          Recomendado para evitar clientes inativos desnecessários
                        </small>
                      </div>
                    </Col>

                    <Col xs={12}>
                      <FormGroup>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FormLabel className="mb-0">Atividade nos últimos (dias)</FormLabel>
                          <i className="bi bi-info-circle text-primary"
                             title="Considera clientes que tiveram algum contrato criado nos últimos X dias"
                             style={{cursor: 'help'}}></i>
                        </div>
                        <FormControl
                          type="number"
                          min="1"
                          max="365"
                          value={filtros.dias_atividade}
                          onChange={(e) => setFiltros(prev => ({ ...prev, dias_atividade: parseInt(e.target.value) || 90 }))}
                        />
                        <small className="text-muted">
                          <i className="bi bi-calendar-week me-1"></i>
                          Data do último contrato criado (independente do status)
                        </small>
                      </FormGroup>
                    </Col>

                    <Col md={6}>
                      <FormGroup>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FormLabel className="mb-0">Data cadastro (início)</FormLabel>
                          <i className="bi bi-info-circle text-primary"
                             title="Importa apenas clientes cadastrados a partir desta data"
                             style={{cursor: 'help'}}></i>
                        </div>
                        <FormControl
                          type="date"
                          value={filtros.data_cadastro_inicio}
                          onChange={(e) => setFiltros(prev => ({ ...prev, data_cadastro_inicio: e.target.value }))}
                        />
                      </FormGroup>
                    </Col>

                    <Col md={6}>
                      <FormGroup>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <FormLabel className="mb-0">Data cadastro (fim)</FormLabel>
                          <i className="bi bi-info-circle text-primary"
                             title="Importa apenas clientes cadastrados até esta data"
                             style={{cursor: 'help'}}></i>
                        </div>
                        <FormControl
                          type="date"
                          value={filtros.data_cadastro_fim}
                          onChange={(e) => setFiltros(prev => ({ ...prev, data_cadastro_fim: e.target.value }))}
                        />
                      </FormGroup>
                    </Col>

                    <Col xs={12}>
                      <div className="alert alert-info">
                        <i className="bi bi-info-circle me-2"></i>
                        <strong>Importação Completa:</strong> O sistema importará todos os clientes que atendem aos filtros.
                        A paginação é feita automaticamente em lotes de 100 registros por requisição.
                      </div>
                    </Col>


                    <Col xs={12}>
                      <FormGroup>
                        <FormLabel>Senha padrão para novos clientes *</FormLabel>
                        <FormControl
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={senhaPadrao}
                          onChange={(e) => setSenhaPadrao(e.target.value)}
                          required
                        />
                      </FormGroup>
                    </Col>

                    <Col xs={12}>
                      <div className="d-grid gap-2">
                        <Button
                          variant="success"
                          onClick={handleImport}
                          disabled={importLoading || previewLoading || !senhaPadrao}
                          className="d-flex align-items-center justify-content-center gap-2"
                          size="lg"
                        >
                          {importLoading ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <i className="bi bi-download"></i>
                          )}
                          {importLoading ? 'Importando clientes...' : 'Importar Clientes'}
                        </Button>

                        <Button
                          variant="outline-secondary"
                          onClick={handlePreview}
                          disabled={previewLoading || importLoading}
                          className="d-flex align-items-center justify-content-center gap-2"
                          size="sm"
                        >
                          {previewLoading ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            <i className="bi bi-search"></i>
                          )}
                          {previewLoading ? 'Consultando...' : 'Ver Preview dos Dados'}
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Form>
              </div>
            </Col>

            {/* Coluna de Preview */}
            <Col md={6}>
              <div className="border rounded p-3 h-100">
                <h6 className="text-primary mb-3">
                  <i className="bi bi-bar-chart me-2"></i>
                  Preview da Importação
                </h6>

                {!previewData && !previewLoading && (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-info-circle display-4 mb-3"></i>
                    <p>Configure os filtros e clique em "Importar Clientes" para executar a importação.</p>
                    <small className="text-muted">Use "Ver Preview dos Dados" se quiser consultar quantos registros serão importados antes.</small>
                  </div>
                )}

                {previewLoading && (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">Carregando...</span>
                    </div>
                    <p className="text-muted">Consultando SGP...</p>
                  </div>
                )}

                {previewData && (
                  <div className="d-flex flex-column gap-3">
                    <div className="row g-2">
                      <div className="col-6">
                        <div className="card border-0 bg-light text-center p-2">
                          <div className="h4 text-primary mb-1">{previewData.total_sgp}</div>
                          <small className="text-muted">Total no SGP</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="card border-0 bg-success text-white text-center p-2">
                          <div className="h4 mb-1">{previewData.total_qualificados}</div>
                          <small>Qualificados</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="card border-0 bg-info text-white text-center p-2">
                          <div className="h4 mb-1">{previewData.novos_clientes}</div>
                          <small>Novos</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="card border-0 bg-warning text-white text-center p-2">
                          <div className="h4 mb-1">{previewData.clientes_para_atualizar}</div>
                          <small>Para atualizar</small>
                        </div>
                      </div>
                    </div>

                    {(previewData.filtrados.atividade > 0 || previewData.filtrados.data > 0 || previewData.filtrados.sem_email > 0) && (
                      <div className="alert alert-warning">
                        <strong>Filtrados:</strong>
                        <ul className="mb-0 mt-1">
                          {previewData.filtrados.atividade > 0 && <li>{previewData.filtrados.atividade} por inatividade</li>}
                          {previewData.filtrados.data > 0 && <li>{previewData.filtrados.data} por data de cadastro</li>}
                          {previewData.filtrados.sem_email > 0 && <li>{previewData.filtrados.sem_email} sem email válido</li>}
                        </ul>
                      </div>
                    )}

                    <div className="text-center">
                      <small className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        Use o botão "Importar Clientes" na seção de filtros para executar a importação
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {error && (
            <div className="alert alert-danger mt-3 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-circle-fill"></i>
              {error}
            </div>
          )}

          {msg && (
            <div className="alert alert-success mt-3 d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill"></i>
              {msg}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </ComponentContainerCard>
  );
}