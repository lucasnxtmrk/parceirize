"use client";

import React, { useState, useEffect } from "react";
import { Button, Table, FormCheck, CardTitle, Modal, Form, Badge } from "react-bootstrap";
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
    
    // Estados para modal de importação
    const [showImportModal, setShowImportModal] = useState(false);
    const [integracoes, setIntegracoes] = useState([]);
    const [importData, setImportData] = useState({
        integracao: 'SGP',
        senha_padrao: ''
    });
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState(null);
    const [importResult, setImportResult] = useState(null);

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
    };

    const handleImportClientes = async () => {
        if (!importData.senha_padrao || importData.senha_padrao.length < 6) {
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
                body: JSON.stringify({ senha_padrao: importData.senha_padrao })
            });

            const data = await response.json();
            
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
                        onClick={handleOpenImportModal}
                        className="d-inline-flex align-items-center gap-2"
                    >
                        <i className="bi bi-download"></i>
                        Importar Clientes
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
                                    <Badge bg={cliente.tipo_cliente === 'parceiro' ? 'success' : 'primary'}>
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
                                        {cliente.tipo_cliente !== 'parceiro' && (
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                onClick={() => handleOpenTransformarModal(cliente)}
                                                title="Transformar em Parceiro"
                                            >
                                                <i className="bi bi-briefcase"></i>
                                            </Button>
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
                            <div className="alert alert-info d-flex align-items-start gap-2 mb-3">
                                <i className="bi bi-info-circle-fill"></i>
                                <div>
                                    <strong>Cliente: {clienteTransformar.nome} {clienteTransformar.sobrenome}</strong><br />
                                    <small>Email: {clienteTransformar.email}</small><br />
                                    <small className="text-muted">
                                        Após a transformação, este cliente poderá acessar a área de parceiros e gerenciar seus próprios vouchers e relatórios.
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

            {/* Modal de Importação de Clientes */}
            <Modal show={showImportModal} onHide={handleCloseImportModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <i className="bi bi-download text-success"></i>
                        Importar Clientes
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="alert alert-info d-flex align-items-start gap-2 mb-3">
                        <i className="bi bi-info-circle-fill"></i>
                        <div>
                            <strong>Sobre a importação:</strong><br />
                            <small>
                                Os clientes importados receberão uma senha padrão e poderão alterá-la no primeiro login.
                                Apenas clientes com contratos ativos na integração serão importados.
                            </small>
                        </div>
                    </div>

                    <Form>
                        <div className="row g-3">
                            <div className="col-12">
                                <Form.Group>
                                    <Form.Label>Integração</Form.Label>
                                    <Form.Select
                                        value={importData.integracao}
                                        onChange={(e) => setImportData({
                                            ...importData,
                                            integracao: e.target.value
                                        })}
                                        disabled
                                    >
                                        <option value="SGP">SGP (Sistema de Gestão de Provedores)</option>
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Atualmente apenas integração SGP está disponível
                                    </Form.Text>
                                </Form.Group>
                            </div>

                            <div className="col-12">
                                <Form.Group>
                                    <Form.Label>Senha padrão para novos clientes *</Form.Label>
                                    <Form.Control 
                                        type="password" 
                                        placeholder="Mínimo 6 caracteres" 
                                        value={importData.senha_padrao}
                                        onChange={(e) => setImportData({
                                            ...importData,
                                            senha_padrao: e.target.value
                                        })}
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        Esta será a senha temporária para todos os novos clientes importados
                                    </Form.Text>
                                </Form.Group>
                            </div>
                        </div>

                        {importError && (
                            <div className="alert alert-danger mt-3 d-flex align-items-center gap-2">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {importError}
                            </div>
                        )}

                        {importResult && (
                            <div className="alert alert-success mt-3">
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
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseImportModal}>
                        {importResult ? 'Fechar' : 'Cancelar'}
                    </Button>
                    {!importResult && (
                        <Button 
                            variant="success" 
                            onClick={handleImportClientes} 
                            disabled={importLoading || !importData.senha_padrao}
                            className="d-inline-flex align-items-center gap-2"
                        >
                            {importLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    Importando...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-download"></i>
                                    Confirmar Importação
                                </>
                            )}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </ComponentContainerCard>
    );
};

export default ClientesPage;
