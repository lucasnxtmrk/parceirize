"use client";

import React, { useState, useEffect } from "react";
import { Button, Table, Row, Col, Image } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ParceiroModal from "./components/ParceiroModal"; // Importando o modal

const ParceirosPage = () => {
    const [parceiros, setParceiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [parceiroSelecionado, setParceiroSelecionado] = useState(null);

    useEffect(() => {
        fetchParceiros();
    }, []);

    // ✅ Função para buscar parceiros
    const fetchParceiros = async () => {
        try {
            const response = await fetch("/api/admin/parceiros");
            if (!response.ok) throw new Error("Erro ao buscar parceiros");

            const data = await response.json();
            setParceiros(data);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    // ✅ Abrir modal (criação ou edição)
    const handleOpenModal = (parceiro = null) => {
        setParceiroSelecionado(parceiro);
        setShowModal(true);
    };

    // ✅ Fechar modal
    const handleCloseModal = () => {
        setParceiroSelecionado(null);
        setShowModal(false);
    };

    // ✅ Atualiza a lista após criar ou editar um parceiro
    const handleParceiroCreated = () => {
        fetchParceiros();
        handleCloseModal();
    };

    if (loading) {
        return <div className="text-center">Carregando parceiros...</div>;
    }

    if (error) {
        return <div className="text-center text-danger">Erro ao carregar parceiros: {error}</div>;
    }

    return (
        <ComponentContainerCard id="gestao-parceiros" title="Gestão de Parceiros" description="Gerencie seus parceiros.">
            {/* Botão para criar novo parceiro */}
            <Row className="mb-3">
                <Col>
                    <Button variant="success" onClick={() => handleOpenModal()}>+ Criar Novo Parceiro</Button>
                </Col>
            </Row>

            {/* Tabela de parceiros */}
            <div className="table-responsive">
                <Table hover align="center">
                    <thead className="table-light">
                        <tr>
                            <th scope="col">Parceiro</th>
                            <th scope="col">Email</th>
                            <th scope="col">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parceiros.map((parceiro) => (
                            <tr key={parceiro.id}>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        {parceiro.foto && (
                                            <Image
                                            src={parceiro.foto ? parceiro.foto : "/assets/images/users/dummy-avatar.jpg"}
                                            alt="Avatar do Parceiro"
                                            className="avatar-sm rounded-circle"
                                            width={40}
                                            height={40}
                                        />
                                        
                                        )}
                                        <div className="d-block">
                                            <h6 className="mb-0">{parceiro.nome_empresa}</h6>
                                        </div>
                                    </div>
                                </td>
                                <td>{parceiro.email}</td>
                                <td>
                                    <Button variant="primary" size="sm" onClick={() => handleOpenModal(parceiro)}>Editar</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* Modal para criar/editar parceiro */}
            <ParceiroModal show={showModal} handleClose={handleCloseModal} onParceiroCreated={handleParceiroCreated} parceiro={parceiroSelecionado} />
        </ComponentContainerCard>
    );
};

export default ParceirosPage;
