"use client";

import React, { useState, useEffect } from "react";
import { Button, Table, FormCheck, CardTitle, Modal, Form, Badge, Row, Col, FormGroup, FormLabel, FormControl } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ClienteModal from "./components/ClienteModal";

const ClientesPage = () => {
    const [clientes, setClientes] = useState([]);
    const [selectedClientes, setSelectedClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showTransformarModal, setShowTransformarModal] = useState(false);
    const [clienteTransformar, setClienteTransformar] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [transformData, setTransformData] = useState({
        categoria_id: '',
        nome_empresa: '',
        descricao: ''
    });
    const [transformLoading, setTransformLoading] = useState(false);
    const [transformError, setTransformError] = useState(null);
    
    // Estados para modal de importação SGP
    const [showImportModal, setShowImportModal] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Estados dos filtros de importação SGP
    const [filtros, setFiltros] = useState({
        apenas_ativos: true,
        dias_atividade: 90,
        data_cadastro_inicio: '',
        data_cadastro_fim: ''
    });
    const [senhaPadrao, setSenhaPadrao] = useState('');

    useEffect(() => {
        fetchClientes();
        fetchCategorias();
    }, []);

    const fetchClientes = async () => {
        try {
            const response = await fetch("/api/admin/clientes");
            if (!response.ok) throw new Error("Erro ao buscar clientes");

            const data = await response.json();
            setClientes(data.clientes || []);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const fetchCategorias = async () => {
        try {
            const response = await fetch("/api/admin/categorias");
            if (!response.ok) throw new Error("Erro ao buscar categorias");

            const data = await response.json();
            setCategorias(data);
        } catch (err) {
            console.error("Erro ao buscar categorias:", err);
        }
    };

    const handleOpenModal = (cliente = null) => {
        setClienteSelecionado(cliente);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setClienteSelecionado(null);
        setShowModal(false);
    };

    const handleClientCreated = () => {
        fetchClientes();
        handleCloseModal();
    };

    const handleCheckboxChange = (id) => {
        setSelectedClientes((prevSelected) =>
            prevSelected.includes(id) ? prevSelected.filter((cid) => cid !== id) : [...prevSelected, id]
        );
    };

    const handleSelectAll = () => {
        setSelectedClientes(selectedClientes.length === clientes.length ? [] : clientes.map((c) => c.id));
    };

    const handleDeleteClientes = async () => {
        try {
            const response = await fetch("/api/admin/clientes", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedClientes }),
            });

            if (!response.ok) throw new Error("Erro ao excluir clientes");

            setShowDeleteModal(false);
            fetchClientes();
            setSelectedClientes([]);
        } catch (err) {
            console.error("❌ Erro ao excluir clientes:", err);
        }
    };

    const handleOpenTransformarModal = (cliente) => {
        setClienteTransformar(cliente);
        setTransformData({
            categoria_id: '',
            nome_empresa: '',
            descricao: ''
        });
        setTransformError(null);
        setShowTransformarModal(true);
    };

    const handleCloseTransformarModal = () => {
        setClienteTransformar(null);
        setShowTransformarModal(false);
        setTransformError(null);
        setTransformLoading(false);
    };

    const handleTransformarCliente = async () => {
        if (!transformData.categoria_id || !transformData.nome_empresa) {
            setTransformError('Categoria e nome da empresa são obrigatórios');
            return;
        }

        setTransformLoading(true);
        setTransformError(null);

        try {
            const response = await fetch("/api/admin/clientes/transformar-parceiro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cliente_id: clienteTransformar.id,
                    ...transformData
                }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || "Erro ao transformar cliente");
            }

            handleCloseTransformarModal();
            fetchClientes();
        } catch (err) {
            setTransformError(err.message);
        } finally {
            setTransformLoading(false);
        }
    };

    // Funções do modal de importação
    const handleOpenImportModal = () => {
        setShowImportModal(true);
        setImportError(null);
        setImportResult(null);
        setImportData({
            integracao: 'SGP',
            senha_padrao: ''
        });
    };

    const handleCloseImportModal = () => {
        setShowImportModal(false);
        setImportError(null);
        setImportResult(null);
        setImportLoading(false);
        setPreviewData(null);
        setPreviewLoading(false);
        setSenhaPadrao('');
    };

    const handlePreview = async () => {
        setPreviewLoading(true);
        setImportError(null);
        setPreviewData(null);

        try {
            const response = await fetch('/api/admin/integracoes/sgp/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filtros })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro no preview');
            }

            setPreviewData(data.preview);
        } catch (error) {
            setImportError(error.message);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleImport = async () => {
        if (!senhaPadrao || senhaPadrao.length < 6) {
            setImportError('Senha padrão deve ter pelo menos 6 caracteres');
            return;
        }

        setImportLoading(true);
        setImportError(null);
        setImportResult(null);

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
                throw new Error(`Erro na resposta do servidor: ${jsonError.message}`);
            }

            if (!response.ok) {
                throw new Error(data.error || 'Erro na importação');
            }

            setImportResult(data);
            // Recarregar lista de clientes
            fetchClientes();
        } catch (error) {
            setImportError(error.message);
        } finally {
            setImportLoading(false);
        }
    };

    if (loading) return <div className="text-center">Carregando clientes...</div>;
    if (error) return <div className="text-center text-danger">Erro ao carregar clientes: {error}</div>;

    return (
        <ComponentContainerCard id="gestao-clientes">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle as="h4" className="mb-0">Gestão de Clientes</CardTitle>

                <div className="d-flex gap-2">
                    <Button variant="primary" onClick={() => handleOpenModal()}>
                        + Criar Novo Cliente
                    </Button>
                    <Button
                        variant="success"
                        onClick={() => setShowImportModal(true)}
                        className="d-inline-flex align-items-center gap-2"
                    >
                        <i className="bi bi-download"></i>
                        Importar do SGP
                    </Button>
                    {selectedClientes.length > 0 && (
                        <Button variant="secondary" onClick={() => setShowDeleteModal(true)}>
                            Excluir Selecionados
                        </Button>
                    )}
                </div>
            </div>

            <div className="table-responsive">
                <Table hover align="center">
                    <thead className="table-light">
                        <tr>
                            <th scope="col">
                                <FormCheck
                                    checked={selectedClientes.length === clientes.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th scope="col">Nome</th>
                            <th scope="col">Sobrenome</th>
                            <th scope="col">Email</th>
                            <th scope="col">Tipo</th>
                            <th scope="col">Status</th>
                            <th scope="col">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clientes.map((cliente) => (
                            <tr key={cliente.id}>
                                <td>
                                    <FormCheck
                                        checked={selectedClientes.includes(cliente.id)}
                                        onChange={() => handleCheckboxChange(cliente.id)}
                                    />
                                </td>
                                <td>{cliente.nome}</td>
                                <td>{cliente.sobrenome}</td>
                                <td>{cliente.email}</td>
                                <td>
                                    <Badge
                                        bg={cliente.tipo_cliente === 'parceiro' ? 'success' : 'primary'}
                                        className="d-flex align-items-center gap-1 justify-content-center"
                                    >
                                        <i className={`bi ${cliente.tipo_cliente === 'parceiro' ? 'bi-shop' : 'bi-person'}`}></i>
                                        {cliente.tipo_cliente === 'parceiro' ? 'Parceiro' : 'Cliente'}
                                    </Badge>
                                </td>
                                <td>
                                    <Badge bg={cliente.ativo ? 'success' : 'danger'}>
                                        {cliente.ativo ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </td>
                                <td>
                                    <div className="d-flex gap-1">
                                        <Button variant="secondary" size="sm" onClick={() => handleOpenModal(cliente)}>
                                            Editar
                                        </Button>
                                        {cliente.tipo_cliente !== 'parceiro' ? (
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleOpenTransformarModal(cliente)}
                                                title="Transformar em Parceiro"
                                                className="d-flex align-items-center gap-1"
                                            >
                                                <i className="bi bi-shop"></i>
                                                <span className="d-none d-md-inline">Tornar Parceiro</span>
                                            </Button>
                                        ) : (
                                            <Badge bg="success" className="d-flex align-items-center gap-1">
                                                <i className="bi bi-check-circle"></i>
                                                <span>Já é Parceiro</span>
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            <ClienteModal
                show={showModal}
                handleClose={handleCloseModal}
                onClientCreated={handleClientCreated}
                cliente={clienteSelecionado}
            />

            {/* 🔴 Modal de confirmação para exclusão */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Exclusão</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Tem certeza que deseja excluir os <strong>{selectedClientes.length}</strong> cliente(s) selecionado(s)?
                    </p>
                    <p className="text-danger">
                        Esta ação é irreversível e também pode apagar dados relacionados como <strong>relatórios, históricos ou acessos</strong>, se existirem.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowDeleteModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="secondary" onClick={handleDeleteClientes}>
                        Confirmar Exclusão
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Transformação Cliente → Parceiro */}
            <Modal show={showTransformarModal} onHide={handleCloseTransformarModal} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <i className="bi bi-shop text-success"></i>
                        Transformar Cliente em Parceiro
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {clienteTransformar && (
                        <>
                            <div className="alert alert-success d-flex align-items-start gap-2 mb-3">
                                <i className="bi bi-person-arrow-right text-success fs-4"></i>
                                <div>
                                    <h6 className="alert-heading mb-1">Transformação em Parceiro</h6>
                                    <strong>Cliente: {clienteTransformar.nome} {clienteTransformar.sobrenome}</strong><br />
                                    <small>Email: {clienteTransformar.email}</small><br />
                                    <small className="text-muted">
                                        <i className="bi bi-check-circle me-1"></i>
                                        Após a transformação, este usuário poderá acessar a área de parceiros e gerenciar seus próprios vouchers e relatórios.
                                    </small>
                                </div>
                            </div>

                            <Form>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Categoria *</Form.Label>
                                            <Form.Select
                                                value={transformData.categoria_id}
                                                onChange={(e) => setTransformData({
                                                    ...transformData,
                                                    categoria_id: e.target.value
                                                })}
                                                required
                                            >
                                                <option value="">Selecione uma categoria</option>
                                                {categorias.map(categoria => (
                                                    <option key={categoria.id} value={categoria.id}>
                                                        {categoria.nome}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </div>

                                    <div className="col-md-6">
                                        <Form.Group>
                                            <Form.Label>Nome da Empresa *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Ex: Minha Loja LTDA"
                                                value={transformData.nome_empresa}
                                                onChange={(e) => setTransformData({
                                                    ...transformData,
                                                    nome_empresa: e.target.value
                                                })}
                                                required
                                            />
                                        </Form.Group>
                                    </div>

                                    <div className="col-12">
                                        <Form.Group>
                                            <Form.Label>Descrição (Opcional)</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                placeholder="Breve descrição sobre o negócio..."
                                                value={transformData.descricao}
                                                onChange={(e) => setTransformData({
                                                    ...transformData,
                                                    descricao: e.target.value
                                                })}
                                            />
                                            <Form.Text className="text-muted">
                                                Esta descrição aparecerá no perfil do parceiro
                                            </Form.Text>
                                        </Form.Group>
                                    </div>
                                </div>

                                {transformError && (
                                    <div className="alert alert-danger mt-3 d-flex align-items-center gap-2">
                                        <i className="bi bi-exclamation-circle-fill"></i>
                                        {transformError}
                                    </div>
                                )}
                            </Form>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseTransformarModal} disabled={transformLoading}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={handleTransformarCliente} 
                        disabled={transformLoading}
                        className="d-inline-flex align-items-center gap-2"
                    >
                        {transformLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Transformando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle"></i>
                                Confirmar Transformação
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Importação SGP */}
            <Modal show={showImportModal} onHide={handleCloseImportModal} centered size="xl">
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
                                                <small className="text-muted">Esta será a senha temporária para todos os novos clientes</small>
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

                        {/* Coluna de Preview/Resultado */}
                        <Col md={6}>
                            <div className="border rounded p-3 h-100">
                                <h6 className="text-primary mb-3">
                                    <i className="bi bi-bar-chart me-2"></i>
                                    {importResult ? 'Resultado da Importação' : 'Preview da Importação'}
                                </h6>

                                {!previewData && !previewLoading && !importResult && (
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

                                {previewData && !importResult && (
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
                                    </div>
                                )}

                                {importResult && (
                                    <div className="alert alert-success">
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <i className="bi bi-check-circle-fill"></i>
                                            <strong>Importação concluída com sucesso!</strong>
                                        </div>
                                        <div className="small">
                                            <div>• <strong>{importResult.criados}</strong> novos clientes criados</div>
                                            <div>• <strong>{importResult.atualizados}</strong> clientes atualizados</div>
                                            <div>• <strong>{importResult.totalProcessados}</strong> clientes processados</div>
                                            {importResult.erros && importResult.erros.length > 0 && (
                                                <div className="mt-2">
                                                    <strong>Avisos:</strong>
                                                    <ul className="mb-0 mt-1">
                                                        {importResult.erros.slice(0, 3).map((erro, i) => (
                                                            <li key={i}>{erro}</li>
                                                        ))}
                                                        {importResult.erros.length > 3 && (
                                                            <li>... e mais {importResult.erros.length - 3} avisos</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Col>
                    </Row>

                    {importError && (
                        <div className="alert alert-danger mt-3 d-flex align-items-center gap-2">
                            <i className="bi bi-exclamation-circle-fill"></i>
                            {importError}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="secondary" onClick={handleCloseImportModal}>
                        {importResult ? 'Fechar' : 'Cancelar'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </ComponentContainerCard>
    );
};

export default ClientesPage;
