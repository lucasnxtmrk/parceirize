"use client";

import React, { useState, useEffect } from "react";
import { Button, Table, Image, CardTitle, Modal } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import ParceiroModal from "./components/ParceiroModal";

const ParceirosPage = () => {
    const [parceiros, setParceiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [parceiroSelecionado, setParceiroSelecionado] = useState(null);
    const [parceiroParaExcluir, setParceiroParaExcluir] = useState(null);

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

    const handleConfirmDelete = async () => {
        try {
            const response = await fetch(`/api/admin/parceiros?id=${parceiroParaExcluir.id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Erro ao excluir parceiro");

            setParceiroParaExcluir(null);
            fetchParceiros();
        } catch (err) {
            alert("Erro ao excluir parceiro: " + err.message);
        }
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
                                <td className="d-flex gap-2">
                                    <Button variant="primary" size="sm" onClick={() => handleOpenModal(parceiro)}>
                                        Editar
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => setParceiroParaExcluir(parceiro)}>
                                        Excluir
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* Modal de Criação / Edição */}
            <ParceiroModal
                show={showModal}
                handleClose={handleCloseModal}
                onParceiroCreated={handleParceiroCreated}
                parceiro={parceiroSelecionado}
            />

            {/* Modal de Confirmação de Exclusão */}
            <Modal show={!!parceiroParaExcluir} onHide={() => setParceiroParaExcluir(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Excluir Parceiro</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Tem certeza que deseja excluir o parceiro <strong>{parceiroParaExcluir?.nome_empresa}</strong>?
                    </p>
                    <p className="text-danger">
                        Essa ação também removerá todos os dados relacionados, incluindo <strong>vouchers utilizados e relatórios</strong>.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setParceiroParaExcluir(null)}>
                        Cancelar
                    </Button>
                    <Button variant="secondary" onClick={handleConfirmDelete}>
                        Confirmar Exclusão
                    </Button>
                </Modal.Footer>
            </Modal>
        </ComponentContainerCard>
    );
};

export default ParceirosPage;
