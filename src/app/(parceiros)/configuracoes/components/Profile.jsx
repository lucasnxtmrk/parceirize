"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Col, Form, FormControl, FormGroup, FormLabel, Modal, Row } from "react-bootstrap";
import { useForm, Controller } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import Avatar from "./Avatar";
import { Nichos } from "@/data/nichos";

const BrowserDefault = () => {
    const { control, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            companyName: "",
            email: "",
            nicho: "",
            foto: "",
            descontoPadrao: 0,
        },
    });

    const { control: passwordControl, handleSubmit: handlePasswordSubmit, reset: resetPassword } = useForm({
        defaultValues: {
            senhaAtual: "",
            novaSenha: "",
            confirmarSenha: ""
        }
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordError, setPasswordError] = useState(null);
    const [passwordMessage, setPasswordMessage] = useState(null);
    const [nichoNome, setNichoNome] = useState("");

    const fotoUrl = watch("foto") || "/assets/images/avatar.jpg";

    useEffect(() => {
        // Buscar dados do perfil do parceiro
        const fetchProfile = async () => {
            try {
                const response = await fetch("/api/parceiro/perfil");
                if (!response.ok) throw new Error("Erro ao buscar perfil");
                
                const data = await response.json();
                setValue("companyName", data.nome_empresa || "");
                setValue("email", data.email || "");
                setValue("nicho", data.nicho || "");
                setValue("foto", data.foto || "");
                setValue("descontoPadrao", data.desconto_padrao || 0);

                // Buscar nome do nicho
                const nicho = Nichos.find(n => n.id === parseInt(data.nicho));
                setNichoNome(nicho ? nicho.nome : data.nicho || "Não informado");
                
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        fetchProfile();
    }, [setValue]);

    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue("foto", reader.result);
            };
            reader.readAsDataURL(file);
        }
    }, [setValue]);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: "image/*",
        multiple: false,
    });

    const onSubmit = async (formData) => {
        setMessage(null);
        setError(null);

        try {
            const response = await fetch("/api/parceiro/perfil", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome_empresa: formData.companyName,
                    email: formData.email,
                    foto: formData.foto,
                    // Não enviar nicho e desconto_padrao - campos readonly
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Erro ao atualizar perfil");

            setMessage("Configurações atualizadas com sucesso!");
        } catch (err) {
            setError(err.message);
        }
    };

    const onPasswordSubmit = async (formData) => {
        setPasswordError(null);
        setPasswordMessage(null);

        if (formData.novaSenha !== formData.confirmarSenha) {
            setPasswordError("As senhas não coincidem");
            return;
        }

        try {
            const response = await fetch("/api/parceiro/alterar-senha", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    senhaAtual: formData.senhaAtual,
                    novaSenha: formData.novaSenha,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Erro ao alterar senha");

            setPasswordMessage("Senha alterada com sucesso!");
            resetPassword();
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordMessage(null);
            }, 2000);
        } catch (err) {
            setPasswordError(err.message);
        }
    };

    if (loading) {
        return <div className="text-center">Carregando configurações...</div>;
    }

    return (
        <ComponentContainerCard id="configuracoes" title="Configurações do Parceiro" description="Atualize suas informações e configurações.">
            {error && <p className="text-danger">{error}</p>}
            {message && <p className="text-success">{message}</p>}

            <form onSubmit={handleSubmit(onSubmit)} className="row g-3">
                <Col xs={12} className="text-center">
                    <div {...getRootProps()} style={{ cursor: "pointer" }}>
                        <input {...getInputProps()} />
                        <Avatar src={fotoUrl} alt="Foto do Parceiro" />
                    </div>
                </Col>

                <Col md={6}>
                    <FormGroup>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <Controller name="companyName" control={control} render={({ field }) => <FormControl type="text" {...field} required />} />
                    </FormGroup>
                </Col>

                <Col md={6}>
                    <FormGroup>
                        <FormLabel>E-mail</FormLabel>
                        <Controller name="email" control={control} render={({ field }) => <FormControl type="email" {...field} disabled />} />
                    </FormGroup>
                </Col>

                <Col md={6}>
                    <FormGroup>
                        <FormLabel>Nicho de Atuação</FormLabel>
                        <FormControl type="text" value={nichoNome} disabled readOnly />
                        <small className="text-muted">Nicho definido pelo provedor - não editável</small>
                    </FormGroup>
                </Col>

                <Col md={6}>
                    <FormGroup>
                        <FormLabel>Desconto Padrão (%)</FormLabel>
                        <Controller
                            name="descontoPadrao"
                            control={control}
                            render={({ field }) => (
                                <FormControl
                                    type="number"
                                    {...field}
                                    value={field.value || 0}
                                    disabled
                                    readOnly
                                />
                            )}
                        />
                        <small className="text-muted">Desconto definido pelo provedor - não editável</small>
                    </FormGroup>
                </Col>

                <Col xs={12} className="d-flex gap-2">
                    <Button variant="primary" type="submit">Salvar Configurações</Button>
                    <Button variant="outline-secondary" onClick={() => setShowPasswordModal(true)}>Alterar Senha</Button>
                </Col>
            </form>

            {/* Modal para alterar senha */}
            <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Alterar Senha</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {passwordError && <p className="text-danger">{passwordError}</p>}
                    {passwordMessage && <p className="text-success">{passwordMessage}</p>}

                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                        <Row className="g-3">
                            <Col xs={12}>
                                <FormGroup>
                                    <FormLabel>Senha Atual</FormLabel>
                                    <Controller
                                        name="senhaAtual"
                                        control={passwordControl}
                                        rules={{ required: "Senha atual é obrigatória" }}
                                        render={({ field }) => (
                                            <FormControl
                                                type="password"
                                                placeholder="Digite sua senha atual"
                                                {...field}
                                            />
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                            <Col xs={12}>
                                <FormGroup>
                                    <FormLabel>Nova Senha</FormLabel>
                                    <Controller
                                        name="novaSenha"
                                        control={passwordControl}
                                        rules={{
                                            required: "Nova senha é obrigatória",
                                            minLength: { value: 6, message: "Senha deve ter pelo menos 6 caracteres" }
                                        }}
                                        render={({ field }) => (
                                            <FormControl
                                                type="password"
                                                placeholder="Digite a nova senha"
                                                {...field}
                                            />
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                            <Col xs={12}>
                                <FormGroup>
                                    <FormLabel>Confirmar Nova Senha</FormLabel>
                                    <Controller
                                        name="confirmarSenha"
                                        control={passwordControl}
                                        rules={{ required: "Confirmação de senha é obrigatória" }}
                                        render={({ field }) => (
                                            <FormControl
                                                type="password"
                                                placeholder="Confirme a nova senha"
                                                {...field}
                                            />
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <div className="d-flex justify-content-end gap-2 mt-3">
                            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
                                Cancelar
                            </Button>
                            <Button variant="primary" type="submit">
                                Alterar Senha
                            </Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </ComponentContainerCard>
    );
};

export default BrowserDefault;