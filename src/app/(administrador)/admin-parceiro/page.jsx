"use client";

import React, { useState, useEffect } from "react";
import { Button, Table, Image, CardTitle, Modal, FormCheck, Card, FormGroup, FormLabel, FormControl, InputGroup, Pagination, Badge } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ParceiroModal from "./components/ParceiroModal";

const ParceirosPage = () => {
    const [parceiros, setParceiros] = useState([]);
    const [selectedParceiros, setSelectedParceiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [parceiroSelecionado, setParceiroSelecionado] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [parceirosParaExcluir, setParceirosParaExcluir] = useState([]);

    // Estados para paginação e busca
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false
    });
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchParceiros = async (page = 1, limit = itemsPerPage, searchTerm = search) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(searchTerm && { search: searchTerm })
            });

            const response = await fetch(`/api/admin/parceiros?${params}`);
            if (!response.ok) throw new Error("Erro ao buscar parceiros");

            const data = await response.json();
            setParceiros(data.parceiros || []);
            setPagination(data.pagination || {});
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParceiros(1, itemsPerPage, '');
    }, []);

    // Removido debounce automático - busca só ao clicar no botão

    // Recarregar apenas quando items per page mudar (manter atual)
    useEffect(() => {
        if (pagination.current_page) {
            fetchParceiros(1, itemsPerPage, search);
        }
    }, [itemsPerPage]);

    const handleOpenModal = (parceiro = null) => {
        setParceiroSelecionado(parceiro);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setParceiroSelecionado(null);
        setShowModal(false);
    };

    const handleParceiroCreated = () => {
        fetchParceiros(pagination.current_page, itemsPerPage, search);
        handleCloseModal();
    };

    const handleCheckboxChange = (id) => {
        setSelectedParceiros((prevSelected) =>
            prevSelected.includes(id) ? prevSelected.filter((pid) => pid !== id) : [...prevSelected, id]
        );
    };

    const handleSelectAll = () => {
        setSelectedParceiros(selectedParceiros.length === parceiros.length ? [] : parceiros.map((p) => p.id));
    };

    const handlePageChange = (page) => {
        fetchParceiros(page, itemsPerPage, search);
        setSelectedParceiros([]); // Limpar seleção ao mudar página
    };

    const handleItemsPerPageChange = (newLimit) => {
        setItemsPerPage(Math.min(newLimit, 50)); // Máximo 50
        setSelectedParceiros([]);
        // A busca será recarregada automaticamente pelo useEffect do itemsPerPage
    };

    const handleSearch = () => {
        setSearch(searchInput);
        fetchParceiros(1, itemsPerPage, searchInput);
        setSelectedParceiros([]);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setSearch('');
        fetchParceiros(1, itemsPerPage, '');
        setSelectedParceiros([]);
    };

    const handleOpenDeleteModal = (parceiroIds = null) => {
        if (parceiroIds) {
            // Exclusão de um único parceiro
            setParceirosParaExcluir([parceiroIds]);
        } else {
            // Exclusão múltipla
            setParceirosParaExcluir(selectedParceiros);
        }
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        try {
            // Se é apenas um parceiro, usar a rota existente
            if (parceirosParaExcluir.length === 1) {
                const response = await fetch(`/api/admin/parceiros?id=${parceirosParaExcluir[0]}`, {
                    method: "DELETE",
                });

                if (!response.ok) throw new Error("Erro ao excluir parceiro");
            } else {
                // Para múltiplos parceiros, excluir um por vez
                for (const parceiroId of parceirosParaExcluir) {
                    const response = await fetch(`/api/admin/parceiros?id=${parceiroId}`, {
                        method: "DELETE",
                    });
                    if (!response.ok) {
                        throw new Error(`Erro ao excluir parceiro ${parceiroId}`);
                    }
                }
            }

            setShowDeleteModal(false);
            setParceirosParaExcluir([]);
            setSelectedParceiros([]);
            fetchParceiros(pagination.current_page, itemsPerPage, search);
        } catch (err) {
            alert("Erro ao excluir parceiro(s): " + err.message);
        }
    };

    if (loading) return <div className="text-center">Carregando parceiros...</div>;
    if (error) return <div className="text-center text-danger">Erro ao carregar parceiros: {error}</div>;

    return (
        <ComponentContainerCard id="gestao-parceiros">
            {/* Cabeçalho: Título + Botões */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle as="h4" className="mb-0">Gestão de Parceiros</CardTitle>
                <div className="d-flex gap-2">
                    <Button variant="primary" onClick={() => handleOpenModal()}>
                        + Criar Novo Parceiro
                    </Button>
                    {selectedParceiros.length > 0 && (
                        <Button variant="danger" onClick={() => handleOpenDeleteModal()}>
                            <i className="bi bi-trash"></i> Excluir ({selectedParceiros.length})
                        </Button>
                    )}
                </div>
            </div>

            {/* Barra de busca e controles */}
            <Card className="mb-3">
                <Card.Body className="py-3">
                    <div className="row align-items-end g-3">
                        <div className="col-md-6">
                            <FormGroup className="mb-0">
                                <FormLabel className="small text-muted mb-1">Buscar parceiros</FormLabel>
                                <div className="position-relative">
                                    <FormControl
                                        type="text"
                                        placeholder="Nome da empresa, email ou nicho..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        style={{ paddingRight: searchInput ? '80px' : '45px' }}
                                    />
                                    {searchInput && (
                                        <Button
                                            size="sm"
                                            variant="link"
                                            onClick={handleClearSearch}
                                            title="Limpar busca"
                                            className="position-absolute text-danger"
                                            style={{
                                                right: '40px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                border: 'none',
                                                padding: '2px 6px',
                                                zIndex: 10
                                            }}
                                        >
                                            <i className="bi bi-x-circle-fill"></i>
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={handleSearch}
                                        title="Buscar"
                                        className="position-absolute"
                                        style={{
                                            right: '5px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            padding: '4px 8px',
                                            zIndex: 10
                                        }}
                                    >
                                        <i className="bi bi-search"></i>
                                    </Button>
                                </div>
                                {search && (
                                    <small className="text-muted mt-1 d-block">
                                        Buscando por: "<strong>{search}</strong>"
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={handleClearSearch}
                                            className="text-danger p-0 ms-1"
                                            style={{ fontSize: '12px', textDecoration: 'none' }}
                                        >
                                            Limpar
                                        </Button>
                                    </small>
                                )}
                            </FormGroup>
                        </div>

                        <div className="col-md-3">
                            <FormGroup className="mb-0">
                                <FormLabel className="small text-muted mb-1">Itens por página</FormLabel>
                                <FormControl
                                    as="select"
                                    value={itemsPerPage}
                                    onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                                >
                                    <option value={5}>5 por página</option>
                                    <option value={10}>10 por página</option>
                                    <option value={20}>20 por página</option>
                                    <option value={30}>30 por página</option>
                                    <option value={50}>50 por página</option>
                                </FormControl>
                            </FormGroup>
                        </div>

                        <div className="col-md-3">
                            <div className="text-end">
                                <small className="text-muted">
                                    <strong>{pagination.total || 0}</strong> parceiro{(pagination.total || 0) !== 1 ? 's' : ''} encontrado{(pagination.total || 0) !== 1 ? 's' : ''}
                                    {search && (
                                        <>
                                            <br />para "<em>{search}</em>"
                                        </>
                                    )}
                                </small>
                            </div>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Tabela */}
            <div className="table-responsive">
                <Table hover align="center">
                    <thead className="table-light">
                        <tr>
                            <th scope="col">
                                <FormCheck
                                    checked={selectedParceiros.length === parceiros.length && parceiros.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th scope="col">Parceiro</th>
                            <th scope="col">Nicho</th>
                            <th scope="col">Vouchers</th>
                            <th scope="col">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parceiros.map((parceiro) => (
                            <tr key={parceiro.id}>
                                <td>
                                    <FormCheck
                                        checked={selectedParceiros.includes(parceiro.id)}
                                        onChange={() => handleCheckboxChange(parceiro.id)}
                                    />
                                </td>
                                <td>
                                    <div className="d-flex align-items-center gap-3">
                                        <Image
                                            src={parceiro.foto && parceiro.foto.trim() !== "" ? parceiro.foto : "/assets/images/avatar.jpg"}
                                            alt="Avatar do Parceiro"
                                            className="avatar-sm rounded-circle"
                                            width={50}
                                            height={50}
                                        />
                                        <div>
                                            <h6 className="mb-1">{parceiro.nome_empresa}</h6>
                                            <small className="text-muted">{parceiro.email}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {parceiro.nicho ? (
                                        <Badge bg="secondary" className="text-white">{parceiro.nicho}</Badge>
                                    ) : (
                                        <span className="text-muted">N/A</span>
                                    )}
                                </td>
                                <td>
                                    <Badge bg="primary" className="text-white">
                                        {parceiro.total_vouchers || 0} voucher{(parceiro.total_vouchers || 0) !== 1 ? 's' : ''}
                                    </Badge>
                                </td>
                                <td>
                                    <div className="d-flex gap-1">
                                        <Button variant="outline-primary" size="sm" onClick={() => handleOpenModal(parceiro)}>
                                            <i className="bi bi-pencil"></i>
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleOpenDeleteModal(parceiro.id)}
                                            title="Excluir parceiro"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* Paginação */}
            {pagination.total_pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                        Mostrando {((pagination.current_page - 1) * pagination.per_page) + 1} a {Math.min(pagination.current_page * pagination.per_page, pagination.total)} de {pagination.total} resultados
                    </small>

                    <Pagination className="mb-0">
                        <Pagination.First
                            onClick={() => handlePageChange(1)}
                            disabled={!pagination.has_prev}
                        />
                        <Pagination.Prev
                            onClick={() => handlePageChange(pagination.current_page - 1)}
                            disabled={!pagination.has_prev}
                        />

                        {/* Páginas próximas */}
                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                            const startPage = Math.max(1, pagination.current_page - 2);
                            const pageNum = startPage + i;

                            if (pageNum <= pagination.total_pages) {
                                return (
                                    <Pagination.Item
                                        key={pageNum}
                                        active={pageNum === pagination.current_page}
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </Pagination.Item>
                                );
                            }
                            return null;
                        })}

                        <Pagination.Next
                            onClick={() => handlePageChange(pagination.current_page + 1)}
                            disabled={!pagination.has_next}
                        />
                        <Pagination.Last
                            onClick={() => handlePageChange(pagination.total_pages)}
                            disabled={!pagination.has_next}
                        />
                    </Pagination>
                </div>
            )}

            {/* Modal de Criação / Edição */}
            <ParceiroModal
                show={showModal}
                handleClose={handleCloseModal}
                onParceiroCreated={handleParceiroCreated}
                parceiro={parceiroSelecionado}
            />

            {/* Modal de Confirmação de Exclusão */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Exclusão</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Tem certeza que deseja excluir {parceirosParaExcluir.length === 1 ? 'o parceiro selecionado' : `os <strong>${parceirosParaExcluir.length}</strong> parceiros selecionados`}?
                    </p>
                    <p className="text-danger">
                        Esta ação é irreversível e também removerá todos os dados relacionados, incluindo <strong>vouchers, vouchers utilizados e relatórios</strong>.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowDeleteModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={handleConfirmDelete}>
                        <i className="bi bi-trash"></i> Confirmar Exclusão
                    </Button>
                </Modal.Footer>
            </Modal>
        </ComponentContainerCard>
    );
};

export default ParceirosPage;