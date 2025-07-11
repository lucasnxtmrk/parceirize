"use client";

import React, { useState, useEffect } from "react";
import { Button, Table, FormCheck, CardTitle, Modal } from "react-bootstrap";
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

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        try {
            const response = await fetch("/api/admin/clientes");
            if (!response.ok) throw new Error("Erro ao buscar clientes");

            const data = await response.json();
            setClientes(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
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
                                    <Button variant="secondary" size="sm" onClick={() => handleOpenModal(cliente)}>Editar</Button>
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
        </ComponentContainerCard>
    );
};

export default ClientesPage;
