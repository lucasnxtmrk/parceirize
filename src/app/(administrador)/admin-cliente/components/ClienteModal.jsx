"use client";

import React, { useState, useEffect } from "react";
import { Button, Modal, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { useForm, Controller } from "react-hook-form";

// 🔹 Função para gerar ID de carteirinha aleatório (6 caracteres alfanuméricos)
const generateRandomId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "";
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
};

// 🔹 Função para gerar um ID único no banco
const generateUniqueId = async () => {
    let newId;
    let exists = true;

    while (exists) {
        newId = generateRandomId();
        try {
            const response = await fetch(`/api/admin/verify-carteirinha?id=${newId}`);
            const data = await response.json();
            exists = data.exists;
        } catch (error) {
            console.error("Erro ao verificar ID da carteirinha:", error);
            exists = false;
        }
    }

    return newId;
};

const ClienteModal = ({ show, handleClose, onClientCreated, cliente }) => {
    const { control, handleSubmit, setValue, reset } = useForm({
        defaultValues: {
            nome: "",
            sobrenome: "",
            email: "",
            senha: "",
            id_carteirinha: "",
        },
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message] = useState(null);
    const isEditMode = Boolean(cliente); // Define se estamos editando um cliente existente

    useEffect(() => {
        if (show) {
            reset(); // Reseta o formulário ao abrir o modal

            if (isEditMode) {
                // Se for edição, preenche os campos com os dados do cliente
                setValue("nome", cliente.nome);
                setValue("sobrenome", cliente.sobrenome);
                setValue("email", cliente.email);
                setValue("id_carteirinha", cliente.id_carteirinha || "N/A");
            } else {
                // Se for novo cliente, gera um ID de carteirinha único
                setValue("id_carteirinha", "Gerando...");
                generateUniqueId().then((uniqueId) => {
                    setValue("id_carteirinha", uniqueId);
                });
            }
        }
    }, [show, cliente, setValue, reset]);

    const onSubmit = async (formData) => {
        setLoading(true);
        setError(null);

        const method = isEditMode ? "PUT" : "POST";
        const url = "/api/admin/clientes";

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isEditMode ? { ...formData, id: cliente.id } : formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao salvar cliente");
            }

            onClientCreated();
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>{isEditMode ? "Editar Cliente" : "Criar Novo Cliente"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <p className="text-danger">{error}</p>}
                {message && <p className="text-success">{message}</p>}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <FormGroup>
                        <FormLabel>Nome</FormLabel>
                        <Controller name="nome" control={control} render={({ field }) => <FormControl type="text" {...field} required />} />
                    </FormGroup>

                    <FormGroup className="mt-3">
                        <FormLabel>Sobrenome</FormLabel>
                        <Controller name="sobrenome" control={control} render={({ field }) => <FormControl type="text" {...field} required />} />
                    </FormGroup>

                    <FormGroup className="mt-3">
                        <FormLabel>E-mail</FormLabel>
                        <Controller name="email" control={control} render={({ field }) => <FormControl type="email" {...field} required />} />
                    </FormGroup>

                    {!isEditMode && (
                        <FormGroup className="mt-3">
                            <FormLabel>Senha</FormLabel>
                            <Controller name="senha" control={control} render={({ field }) => <FormControl type="password" {...field} required />} />
                        </FormGroup>
                    )}

                    <FormGroup className="mt-3">
                        <FormLabel>ID da Carteirinha</FormLabel>
                        <Controller name="id_carteirinha" control={control} render={({ field }) => <FormControl type="text" {...field} readOnly />} />
                    </FormGroup>

                    <div className="d-flex justify-content-end mt-4">
                        <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancelar</Button>
                        <Button variant="primary" type="submit" className="ms-2" disabled={loading}>
                            {loading ? "Salvando..." : isEditMode ? "Salvar Alterações" : "Criar Cliente"}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
};

export default ClienteModal;
