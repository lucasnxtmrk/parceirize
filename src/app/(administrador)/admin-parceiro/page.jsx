"use client";

import React, { useState, useEffect } from "react";
import { Button, Table, Image, CardTitle } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ParceiroModal from "./components/ParceiroModal";

const ParceirosPage = () => {
    const [parceiros, setParceiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [parceiroSelecionado, setParceiroSelecionado] = useState(null);

    useEffect(() => {
        fetchParceiros();
    }, []);

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

    const handleOpenModal = (parceiro = null) => {
        setParceiroSelecionado(parceiro);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setParceiroSelecionado(null);
        setShowModal(false);
    };

    const handleParceiroCreated = () => {
        fetchParceiros();
        handleCloseModal();
    };

    if (loading) return <div className="text-center">Carregando parceiros...</div>;
    if (error) return <div className="text-center text-danger">Erro ao carregar parceiros: {error}</div>;

    return (
        <ComponentContainerCard id="gestao-parceiros">
            {/* Cabeçalho: Título + Botão */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle as="h4" className="mb-0">Gestão de Parceiros</CardTitle>
                <Button variant="primary" onClick={() => handleOpenModal()}>
                    + Criar Novo Parceiro
                </Button>
            </div>

            {/* Tabela */}
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
                                                src={parceiro.foto || "/assets/images/users/dummy-avatar.jpg"}
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
                                    <Button variant="secondary" size="sm" onClick={() => handleOpenModal(parceiro)}>
                                        Editar
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* Modal */}
            <ParceiroModal
                show={showModal}
                handleClose={handleCloseModal}
                onParceiroCreated={handleParceiroCreated}
                parceiro={parceiroSelecionado}
            />
        </ComponentContainerCard>
    );
};

export default ParceirosPage;
