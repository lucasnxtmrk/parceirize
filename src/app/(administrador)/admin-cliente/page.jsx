"use client";

import React, { useState, useEffect } from "react";
import { Button, Table, FormCheck, Row, Col } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ClienteModal from "./components/ClienteModal";

const ClientesPage = () => {
    const [clientes, setClientes] = useState([]);
    const [selectedClientes, setSelectedClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [clienteSelecionado, setClienteSelecionado] = useState(null);

    useEffect(() => {
        fetchClientes();
    }, []);

    // Função para buscar clientes
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

    // Função para abrir o modal (novo ou edição)
    const handleOpenModal = (cliente = null) => {
        setClienteSelecionado(cliente);
        setShowModal(true);
    };

    // Função para fechar o modal
    const handleCloseModal = () => {
        setClienteSelecionado(null);
        setShowModal(false);
    };

    // ✅ Correção: Atualiza a lista de clientes após criar ou editar um cliente
    const handleClientCreated = () => {
        fetchClientes(); // Atualiza a tabela
        handleCloseModal(); // Fecha o modal
    };

    // Seleção de múltiplos clientes
    const handleCheckboxChange = (id) => {
        setSelectedClientes((prevSelected) =>
            prevSelected.includes(id) ? prevSelected.filter((cid) => cid !== id) : [...prevSelected, id]
        );
    };

    // Seleção de todos os clientes
    const handleSelectAll = () => {
        setSelectedClientes(selectedClientes.length === clientes.length ? [] : clientes.map((c) => c.id));
    };

    // Função para excluir clientes selecionados
    const handleDeleteClientes = async () => {
        if (!window.confirm("Tem certeza que deseja excluir os clientes selecionados?")) return;

        try {
            const response = await fetch("/api/admin/clientes", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedClientes }),
            });

            if (!response.ok) throw new Error("Erro ao excluir clientes");

            fetchClientes(); // Atualiza a lista após exclusão
            setSelectedClientes([]);
        } catch (err) {
            console.error("❌ Erro ao excluir clientes:", err);
        }
    };

    if (loading) {
        return <div className="text-center">Carregando clientes...</div>;
    }

    if (error) {
        return <div className="text-center text-danger">Erro ao carregar clientes: {error}</div>;
    }

    return (
        <ComponentContainerCard id="gestao-clientes" title="Gestão de Clientes" description="Gerencie seus clientes.">
            {/* Botões de ação */}
            <Row className="mb-3">
                <Col>
                    <Button variant="success" onClick={() => handleOpenModal()}>+ Criar Novo Cliente</Button>
                </Col>
                <Col className="text-end">
                    {selectedClientes.length > 0 && (
                        <Button variant="danger" onClick={handleDeleteClientes}>Excluir Selecionados</Button>
                    )}
                </Col>
            </Row>

            {/* Tabela de clientes */}
            <div className="table-responsive">
                <Table striped borderless hover>
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
                                    <Button variant="green" size="sm" onClick={() => handleOpenModal(cliente)}>Editar</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* ✅ Correção: Passando corretamente a função handleClientCreated */}
            <ClienteModal show={showModal} handleClose={handleCloseModal} onClientCreated={handleClientCreated} cliente={clienteSelecionado} />
        </ComponentContainerCard>
    );
};

export default ClientesPage;
