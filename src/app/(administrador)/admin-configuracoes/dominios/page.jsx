'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Alert, Modal, Form, Spinner, Nav } from 'react-bootstrap';
import { FaPlus, FaCheck, FaTimes, FaExclamationTriangle, FaEye, FaTrash, FaSync } from 'react-icons/fa';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationContainer from '@/components/shared/NotificationContainer';

const DominiosPage = () => {
  const [dominios, setDominios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dominios');

  const { alerts, showSuccess, showError, showWarning, hideAlert } = useNotifications();

  // Form states
  const [formData, setFormData] = useState({
    dominio: '',
    tipo: 'personalizado'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDominios();
  }, []);

  const loadDominios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dominios');
      const data = await response.json();

      if (data.success) {
        setDominios(data.dominios);
      } else {
        showError('Erro ao carregar domínios');
      }
    } catch (error) {
      console.error('Erro ao carregar domínios:', error);
      showError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();

    // Validar form
    const errors = {};
    if (!formData.dominio.trim()) {
      errors.dominio = 'Domínio é obrigatório';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);

      const response = await fetch('/api/admin/dominios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Domínio adicionado com sucesso!');
        setShowAddModal(false);
        setFormData({ dominio: '', tipo: 'personalizado' });
        loadDominios();
      } else {
        showError(data.error || 'Erro ao adicionar domínio');
      }
    } catch (error) {
      console.error('Erro ao adicionar domínio:', error);
      showError('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDomain = async (dominio) => {
    try {
      const response = await fetch('/api/admin/dominios/verificar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dominio_id: dominio.id }),
      });

      const data = await response.json();

      if (data.success && data.verificado) {
        showSuccess('Domínio verificado com sucesso!');
        loadDominios();
      } else {
        showWarning(`Verificação falhou: ${data.detalhes?.error || 'Configuração DNS não encontrada'}`);
      }
    } catch (error) {
      console.error('Erro ao verificar domínio:', error);
      showError('Erro na verificação');
    }
  };

  const handleDeleteDomain = async (dominio) => {
    if (!confirm(`Tem certeza que deseja remover o domínio ${dominio.dominio}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/dominios?id=${dominio.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Domínio removido com sucesso!');
        loadDominios();
      } else {
        showError(data.error || 'Erro ao remover domínio');
      }
    } catch (error) {
      console.error('Erro ao remover domínio:', error);
      showError('Erro de conexão');
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/dominios/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleShowStats = async () => {
    setShowStatsModal(true);
    await loadStats();
  };

  const formatLastAccess = (timestamp) => {
    if (!timestamp) return 'Nunca';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 30) return `${diffDays} dias atrás`;

    return date.toLocaleDateString('pt-BR');
  };

  const getDomainStatusBadge = (dominio) => {
    if (!dominio.verificado) {
      return <Badge bg="warning">Pendente</Badge>;
    }

    if (dominio.ultimo_acesso) {
      const daysSinceAccess = Math.floor((new Date() - new Date(dominio.ultimo_acesso)) / (1000 * 60 * 60 * 24));
      if (daysSinceAccess <= 7) {
        return <Badge bg="success">Ativo</Badge>;
      }
    }

    return <Badge bg="secondary">Verificado</Badge>;
  };

  const renderInstrucoesDNS = (dominio) => {
    if (!dominio || dominio.verificado) return null;

    return (
      <Alert variant="info" className="mt-3">
        <h6><FaExclamationTriangle className="me-2" />Configuração DNS Necessária</h6>
        <p className="mb-2">Para verificar este domínio, adicione o seguinte registro TXT ao seu DNS:</p>
        <div className="bg-light p-2 rounded font-monospace small">
          <strong>Host:</strong> _parceirize.{dominio.dominio}<br />
          <strong>Tipo:</strong> TXT<br />
          <strong>Valor:</strong> {dominio.verificacao_token}
        </div>
        <small className="text-muted mt-2 d-block">
          A verificação pode levar até 24 horas para propagar.
        </small>
      </Alert>
    );
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <NotificationContainer alerts={alerts} onHide={hideAlert} />

      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>Gestão de Domínios</h2>
              <p className="text-muted">Configure domínios personalizados para sua plataforma</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" onClick={handleShowStats}>
                <FaEye className="me-2" />
                Estatísticas
              </Button>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                <FaPlus className="me-2" />
                Adicionar Domínio
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Tabs */}
      <Row className="mb-4">
        <Col>
          <Nav variant="tabs">
            <Nav.Item>
              <Nav.Link
                active={activeTab === 'dominios'}
                onClick={() => setActiveTab('dominios')}
              >
                Meus Domínios ({dominios.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={activeTab === 'ajuda'}
                onClick={() => setActiveTab('ajuda')}
              >
                Ajuda & Documentação
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
      </Row>

      {/* Conteúdo das tabs */}
      {activeTab === 'dominios' && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Domínios Configurados</h5>
                  <Button variant="outline-secondary" size="sm" onClick={loadDominios}>
                    <FaSync className="me-1" />
                    Atualizar
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {dominios.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">Nenhum domínio configurado ainda.</p>
                    <Button variant="primary" onClick={() => setShowAddModal(true)}>
                      <FaPlus className="me-2" />
                      Adicionar Primeiro Domínio
                    </Button>
                  </div>
                ) : (
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Domínio</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Último Acesso</th>
                        <th>Criado</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dominios.map((dominio) => (
                        <tr key={dominio.id}>
                          <td>
                            <div>
                              <strong>{dominio.dominio}</strong>
                              {dominio.tipo === 'subdominio' && (
                                <Badge bg="info" className="ms-2">Padrão</Badge>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge bg={dominio.tipo === 'subdominio' ? 'secondary' : 'primary'}>
                              {dominio.tipo === 'subdominio' ? 'Subdomínio' : 'Personalizado'}
                            </Badge>
                          </td>
                          <td>{getDomainStatusBadge(dominio)}</td>
                          <td>{formatLastAccess(dominio.ultimo_acesso)}</td>
                          <td>{new Date(dominio.criado_em).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <div className="d-flex gap-1">
                              {!dominio.verificado && (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleVerifyDomain(dominio)}
                                  title="Verificar configuração"
                                >
                                  <FaCheck />
                                </Button>
                              )}
                              {dominio.tipo === 'personalizado' && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteDomain(dominio)}
                                  title="Remover domínio"
                                >
                                  <FaTrash />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}

                {/* Mostrar instruções DNS para domínios não verificados */}
                {dominios.filter(d => !d.verificado).map(dominio => (
                  <div key={`instrucoes-${dominio.id}`}>
                    {renderInstrucoesDNS(dominio)}
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {activeTab === 'ajuda' && (
        <Row>
          <Col lg={8}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Como Configurar Domínios Personalizados</h5>
              </Card.Header>
              <Card.Body>
                <h6>1. Adicionar Domínio</h6>
                <p>Clique em "Adicionar Domínio" e digite seu domínio personalizado (ex: descontos.suaempresa.com.br).</p>

                <h6>2. Configurar DNS</h6>
                <p>Após adicionar, você receberá instruções para configurar um registro TXT no DNS do seu domínio:</p>
                <div className="bg-light p-3 rounded">
                  <code>_parceirize.seudominio.com TXT "parceirize-verify-abc123..."</code>
                </div>

                <h6>3. Verificação</h6>
                <p>Clique em "Verificar" após configurar o DNS. A verificação pode levar até 24 horas.</p>

                <h6>4. Uso</h6>
                <p>Após verificado, seus clientes e parceiros poderão acessar:</p>
                <ul>
                  <li><strong>Clientes:</strong> https://seudominio.com/carteirinha</li>
                  <li><strong>Parceiros:</strong> https://seudominio.com/painel</li>
                  <li><strong>Login:</strong> https://seudominio.com/auth/login</li>
                </ul>

                <Alert variant="info">
                  <h6>💡 Dicas Importantes</h6>
                  <ul className="mb-0">
                    <li>Use subdomínios (ex: clube.empresa.com) para melhor organização</li>
                    <li>Certifique-se de que o domínio aponta para nossos servidores</li>
                    <li>O certificado SSL é configurado automaticamente</li>
                    <li>Suporte disponível via chat para configurações avançadas</li>
                  </ul>
                </Alert>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            <Card>
              <Card.Header>
                <h6 className="mb-0">Provedores DNS Suportados</h6>
              </Card.Header>
              <Card.Body>
                <ul className="list-unstyled">
                  <li>✅ Cloudflare</li>
                  <li>✅ GoDaddy</li>
                  <li>✅ Registro.br</li>
                  <li>✅ Amazon Route 53</li>
                  <li>✅ Google Domains</li>
                  <li>✅ Namecheap</li>
                </ul>
                <small className="text-muted">
                  Outros provedores também são suportados. Entre em contato se precisar de ajuda.
                </small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Modal Adicionar Domínio */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Adicionar Domínio Personalizado</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddDomain}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Domínio</Form.Label>
              <Form.Control
                type="text"
                placeholder="ex: descontos.suaempresa.com.br"
                value={formData.dominio}
                onChange={(e) => setFormData({ ...formData, dominio: e.target.value })}
                isInvalid={!!formErrors.dominio}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.dominio}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Digite apenas o domínio, sem http:// ou https://
              </Form.Text>
            </Form.Group>

            <Alert variant="warning">
              <small>
                <strong>Atenção:</strong> Certifique-se de que você tem acesso para configurar
                registros DNS neste domínio antes de prosseguir.
              </small>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Adicionando...
                </>
              ) : (
                'Adicionar Domínio'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Estatísticas */}
      <Modal show={showStatsModal} onHide={() => setShowStatsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Estatísticas de Domínios</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stats ? (
            <div>
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-primary">{stats.resumo.total_dominios}</h4>
                      <small>Total de Domínios</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-success">{stats.resumo.dominios_verificados}</h4>
                      <small>Verificados</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-info">{stats.resumo.total_ips_unicos}</h4>
                      <small>IPs Únicos</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="text-center">
                    <Card.Body>
                      <h4 className="text-warning">{stats.resumo.acessos_ultimas_24h}</h4>
                      <small>Acessos 24h</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {stats.dominios.length > 0 && (
                <div>
                  <h6>Domínios por Acessos</h6>
                  <Table size="sm">
                    <thead>
                      <tr>
                        <th>Domínio</th>
                        <th>Acessos</th>
                        <th>IPs Únicos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.dominios.slice(0, 5).map((d, i) => (
                        <tr key={i}>
                          <td>{d.dominio}</td>
                          <td>{d.total_acessos}</td>
                          <td>{d.ips_unicos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <Spinner animation="border" />
              <p className="mt-2">Carregando estatísticas...</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatsModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DominiosPage;