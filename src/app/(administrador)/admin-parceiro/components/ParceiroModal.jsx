"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Modal, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { useForm, Controller } from "react-hook-form";
import { useDropzone } from "react-dropzone";

// 🔹 Função para gerar um voucher baseado no nome da empresa e desconto
const generateVoucherCode = (nomeEmpresa, desconto) => {
    const formattedName = nomeEmpresa.replace(/\s+/g, "").toUpperCase().substring(0, 3);
    const randomNumber = Math.floor(100 + Math.random() * 900);
    return `${formattedName}${desconto}${randomNumber}`;
};

// 🔹 Função para gerar um voucher único verificando no banco
const generateUniqueVoucher = async (nomeEmpresa, desconto) => {
    let voucherCode;
    let exists = true;

    while (exists) {
        voucherCode = generateVoucherCode(nomeEmpresa, desconto);
        try {
            const response = await fetch(`/api/admin/verify-voucher?voucher=${voucherCode}`);
            const data = await response.json();
            exists = data.exists;
        } catch (error) {
            console.error("Erro ao verificar voucher:", error);
            exists = false;
        }
    }

    return voucherCode;
};

const ParceiroModal = ({ show, handleClose, parceiro, onParceiroCreated }) => {
    const { control, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            nome_empresa: "",
            email: "",
            senha: "",
            desconto: "",
            voucher_codigo: "",
            foto: "",
            limitar_voucher: false,
            limite_uso: "",
        },
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fotoPreview = watch("foto") || "/assets/images/parceiros/dummy-avatar.jpg";
    const limitarVoucher = watch("limitar_voucher");

    // Atualiza o estado do checkbox quando o parceiro for editado
    useEffect(() => {
        if (show) {
            reset();
            if (parceiro) {
                setValue("nome_empresa", parceiro.nome_empresa);
                setValue("email", parceiro.email);
                setValue("desconto", parceiro.desconto || "");
                setValue("voucher_codigo", parceiro.voucher_codigo || "");
                setValue("foto", parceiro.foto || "/assets/images/parceiros/dummy-avatar.jpg");

                // 🔹 Se o parceiro tiver limite de voucher, marcamos o checkbox e preenchemos o campo
                if (parceiro.limite_uso !== null && parceiro.limite_uso !== undefined && parceiro.limite_uso !== "") {
                    setValue("limitar_voucher", true);
                    setValue("limite_uso", parceiro.limite_uso);
                } else {
                    setValue("limitar_voucher", false);
                    setValue("limite_uso", "");
                }
            } else {
                setValue("voucher_codigo", "Gerando...");
            }
        }
    }, [show, parceiro, setValue, reset]);

    // Atualiza o voucher automaticamente ao digitar o desconto
    useEffect(() => {
        const nomeEmpresa = watch("nome_empresa");
        const desconto = watch("desconto");

        if (!parceiro && nomeEmpresa && desconto) {
            generateUniqueVoucher(nomeEmpresa, desconto).then((uniqueVoucher) => {
                setValue("voucher_codigo", uniqueVoucher);
            });
        }
    }, [watch("nome_empresa"), watch("desconto"), parceiro, setValue]);

    // Upload de imagem
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

    // Enviar dados para API
    const onSubmit = async (formData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/admin/parceiros", {
                method: parceiro ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    id: parceiro?.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao salvar parceiro");
            }

            onParceiroCreated();
            reset();
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
                <Modal.Title>{parceiro ? "Editar Parceiro" : "Criar Novo Parceiro"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <p className="text-danger">{error}</p>}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <FormGroup>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <Controller name="nome_empresa" control={control} render={({ field }) => <FormControl type="text" {...field} required />} />
                    </FormGroup>

                    <FormGroup className="mt-3">
                        <FormLabel>E-mail</FormLabel>
                        <Controller name="email" control={control} render={({ field }) => <FormControl type="email" {...field} required />} />
                    </FormGroup>

                    {!parceiro && (
                        <FormGroup className="mt-3">
                            <FormLabel>Senha</FormLabel>
                            <Controller name="senha" control={control} render={({ field }) => <FormControl type="password" {...field} required />} />
                        </FormGroup>
                    )}

                    <FormGroup className="mt-3">
                        <FormLabel>Desconto (%)</FormLabel>
                        <Controller name="desconto" control={control} render={({ field }) => <FormControl type="number" min="1" max="100" {...field} required />} />
                    </FormGroup>

                    <FormGroup className="mt-3">
                        <FormLabel>Voucher</FormLabel>
                        <Controller name="voucher_codigo" control={control} render={({ field }) => <FormControl type="text" {...field} required />} />
                    </FormGroup>

                    {/* Checkbox para limitar voucher */}
                    <FormGroup className="mt-3">
                        <Form.Check
                            type="checkbox"
                            label="Limitar uso do voucher"
                            {...control.register("limitar_voucher")}
                        />
                    </FormGroup>

                    {/* Campo de limite, visível apenas se o checkbox estiver marcado */}
                    {limitarVoucher && (
                        <FormGroup className="mt-3">
                            <FormLabel>Quantas vezes o cliente pode utilizar o voucher dentro de 30 dias?</FormLabel>
                            <Controller
                                name="limite_uso"
                                control={control}
                                render={({ field }) => <FormControl type="number" min="1" required {...field} />}
                            />
                        </FormGroup>
                    )}

                    <div className="d-flex justify-content-end mt-4">
                        <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancelar</Button>
                        <Button variant="primary" type="submit" className="ms-2" disabled={loading}>
                            {loading ? "Salvando..." : parceiro ? "Salvar Alterações" : "Criar Parceiro"}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
};

export default ParceiroModal;
