"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Modal, Form, FormControl, FormGroup, FormLabel, Alert, InputGroup, Row, Col, Badge, Spinner } from "react-bootstrap";
import { useForm, Controller } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { Nichos } from "@/data/nichos";
import { FaBuilding, FaEnvelope, FaLock, FaPercent, FaTicketAlt, FaTags, FaImage, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaMapMarkerAlt } from "react-icons/fa";
import { geocodeByCep, formatCep, cleanCep, isValidCep } from "@/lib/geocoding";

const generateVoucherCode = (nomeEmpresa, desconto) => {
    const formattedName = nomeEmpresa.replace(/\s+/g, "").toUpperCase().substring(0, 3);
    const randomNumber = Math.floor(100 + Math.random() * 900);
    return `${formattedName}${desconto}${randomNumber}`;
};

const generateUniqueVoucher = async (nomeEmpresa, desconto) => {
    let voucherCode;
    let exists = true;

    while (exists) {
        voucherCode = generateVoucherCode(nomeEmpresa, desconto);
        try {
            const response = await fetch(`/api/admin/validarVoucher?voucher=${voucherCode}`);
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
    const { control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
        defaultValues: {
            nome_empresa: "",
            email: "",
            senha: "",
            desconto: "",
            voucher_codigo: "",
            foto: "",
            limitar_voucher: false,
            limite_uso: "",
            nicho: "",
            cep: "",
            endereco: "",
            cidade: "",
            estado: ""
        },
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [generatingVoucher, setGeneratingVoucher] = useState(false);
    const [lookingUpCep, setLookingUpCep] = useState(false);
    const [cepError, setCepError] = useState(null);
    const fotoPreview = watch("foto") || "/assets/images/avatar.jpg";
    const limitarVoucher = watch("limitar_voucher");
    const [novaSenha, setNovaSenha] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (show) {
            reset();
            setNovaSenha("");
            setError(null);
            setSuccess(null);

            if (parceiro) {
                setValue("nome_empresa", parceiro.nome_empresa);
                setValue("email", parceiro.email);
                setValue("desconto", parceiro.desconto || "");
                setValue("voucher_codigo", parceiro.voucher_codigo || "");
                setValue("foto", parceiro.foto || "/assets/images/avatar.jpg");
                setValue("nicho", parceiro.nicho || "");
                setValue("cep", parceiro.cep || "");
                setValue("endereco", parceiro.endereco || "");
                setValue("cidade", parceiro.cidade || "");
                setValue("estado", parceiro.estado || "");

                const limiteNumero = Number(parceiro.limite_uso);
                const temLimite = !isNaN(limiteNumero) && limiteNumero > 0;

                setValue("limitar_voucher", temLimite);
                setValue("limite_uso", temLimite ? String(limiteNumero) : "");
            } else {
                setValue("voucher_codigo", "");
                setValue("limitar_voucher", false);
                setValue("limite_uso", "");
            }
        }
    }, [show, parceiro, setValue, reset]);

    useEffect(() => {
        const nomeEmpresa = watch("nome_empresa");
        const desconto = watch("desconto");

        if (!parceiro && nomeEmpresa && desconto && nomeEmpresa.length >= 3 && desconto > 0) {
            setGeneratingVoucher(true);
            generateUniqueVoucher(nomeEmpresa, desconto).then((uniqueVoucher) => {
                setValue("voucher_codigo", uniqueVoucher);
                setGeneratingVoucher(false);
            });
        }
    }, [watch("nome_empresa"), watch("desconto"), parceiro, setValue]);

    const handleCepChange = async (cepValue) => {
        const formatted = formatCep(cepValue);
        setValue("cep", formatted);
        setCepError(null);

        const clean = cleanCep(cepValue);
        if (clean.length === 8 && isValidCep(clean)) {
            setLookingUpCep(true);
            try {
                const addressData = await geocodeByCep(clean);
                setValue("endereco", addressData.endereco);
                setValue("cidade", addressData.cidade);
                setValue("estado", addressData.estado);
            } catch (error) {
                setCepError(error.message);
            } finally {
                setLookingUpCep(false);
            }
        }
    };

    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError("Imagem muito grande. Máximo 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue("foto", reader.result);
            };
            reader.readAsDataURL(file);
        }
    }, [setValue]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif']
        },
        multiple: false,
    });

    const onSubmit = async (formData) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Validações extras
            if (!parceiro && !formData.senha) {
                throw new Error("Senha é obrigatória para novo parceiro");
            }

            if (formData.desconto < 1 || formData.desconto > 100) {
                throw new Error("Desconto deve estar entre 1% e 100%");
            }

            const dados = {
                ...formData,
                id: parceiro?.id,
                novaSenha: parceiro ? novaSenha : undefined,
                limite_uso: formData.limitar_voucher ? Number(formData.limite_uso) : null,
            };

            const response = await fetch("/api/admin/parceiros", {
                method: parceiro ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Erro ao salvar parceiro");

            setSuccess(parceiro ? "Parceiro atualizado com sucesso!" : "Parceiro criado com sucesso!");
            setTimeout(() => {
                onParceiroCreated();
                reset();
                handleClose();
            }, 1500);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered size="lg">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="d-flex align-items-center">
                    <FaBuilding className="me-2" />
                    {parceiro ? "Editar Parceiro" : "Cadastrar Novo Parceiro"}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        <FaExclamationTriangle className="me-2" />
                        {error}
                    </Alert>
                )}
                
                {success && (
                    <Alert variant="success">
                        <FaCheckCircle className="me-2" />
                        {success}
                    </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Seção de Informações Básicas */}
                    <div className="border rounded p-3 mb-3">
                        <h6 className="text-primary mb-3">
                            <FaInfoCircle className="me-2" />
                            Informações Básicas
                        </h6>
                        
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <FormLabel>
                                        <FaBuilding className="me-1" />
                                        Nome da Empresa *
                                    </FormLabel>
                                    <Controller 
                                        name="nome_empresa" 
                                        control={control}
                                        rules={{ 
                                            required: "Nome é obrigatório",
                                            minLength: { value: 3, message: "Mínimo 3 caracteres" }
                                        }}
                                        render={({ field }) => (
                                            <>
                                                <FormControl 
                                                    type="text" 
                                                    {...field} 
                                                    isInvalid={errors.nome_empresa}
                                                    placeholder="Ex: Restaurante Sabor & Arte"
                                                />
                                                {errors.nome_empresa && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.nome_empresa.message}
                                                    </Form.Control.Feedback>
                                                )}
                                            </>
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                            
                            <Col md={6}>
                                <FormGroup>
                                    <FormLabel>
                                        <FaEnvelope className="me-1" />
                                        E-mail *
                                    </FormLabel>
                                    <Controller 
                                        name="email" 
                                        control={control}
                                        rules={{ 
                                            required: "E-mail é obrigatório",
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "E-mail inválido"
                                            }
                                        }}
                                        render={({ field }) => (
                                            <>
                                                <FormControl 
                                                    type="email" 
                                                    {...field}
                                                    isInvalid={errors.email}
                                                    placeholder="parceiro@email.com"
                                                />
                                                {errors.email && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.email.message}
                                                    </Form.Control.Feedback>
                                                )}
                                            </>
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row className="mt-3">
                            <Col md={6}>
                                {parceiro ? (
                                    <FormGroup>
                                        <FormLabel>
                                            <FaLock className="me-1" />
                                            Nova Senha (opcional)
                                        </FormLabel>
                                        <InputGroup>
                                            <FormControl
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Deixe em branco para manter"
                                                value={novaSenha}
                                                onChange={(e) => setNovaSenha(e.target.value)}
                                            />
                                            <Button 
                                                variant="outline-secondary"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? "👁️" : "👁️‍🗨️"}
                                            </Button>
                                        </InputGroup>
                                    </FormGroup>
                                ) : (
                                    <FormGroup>
                                        <FormLabel>
                                            <FaLock className="me-1" />
                                            Senha *
                                        </FormLabel>
                                        <Controller 
                                            name="senha" 
                                            control={control}
                                            rules={{ 
                                                required: "Senha é obrigatória",
                                                minLength: { value: 6, message: "Mínimo 6 caracteres" }
                                            }}
                                            render={({ field }) => (
                                                <InputGroup>
                                                    <FormControl 
                                                        type={showPassword ? "text" : "password"}
                                                        {...field}
                                                        isInvalid={errors.senha}
                                                        placeholder="Mínimo 6 caracteres"
                                                    />
                                                    <Button 
                                                        variant="outline-secondary"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? "👁️" : "👁️‍🗨️"}
                                                    </Button>
                                                    {errors.senha && (
                                                        <Form.Control.Feedback type="invalid">
                                                            {errors.senha.message}
                                                        </Form.Control.Feedback>
                                                    )}
                                                </InputGroup>
                                            )}
                                        />
                                    </FormGroup>
                                )}
                            </Col>
                            
                            <Col md={6}>
                                <FormGroup>
                                    <FormLabel>
                                        <FaTags className="me-1" />
                                        Nicho/Categoria *
                                    </FormLabel>
                                    <Controller
                                        name="nicho"
                                        control={control}
                                        rules={{ required: "Selecione um nicho" }}
                                        render={({ field }) => (
                                            <>
                                                <Form.Select 
                                                    {...field}
                                                    isInvalid={errors.nicho}
                                                >
                                                    <option value="">Selecione um nicho</option>
                                                    {Nichos.map((n) => (
                                                        <option key={n.id} value={n.id}>{n.nome}</option>
                                                    ))}
                                                </Form.Select>
                                                {errors.nicho && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.nicho.message}
                                                    </Form.Control.Feedback>
                                                )}
                                            </>
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </div>

                    {/* Seção de Endereço */}
                    <div className="border rounded p-3 mb-3">
                        <h6 className="text-primary mb-3">
                            <FaMapMarkerAlt className="me-2" />
                            Localização do Estabelecimento
                        </h6>
                        
                        <Row>
                            <Col md={4}>
                                <FormGroup>
                                    <FormLabel>
                                        <FaMapMarkerAlt className="me-1" />
                                        CEP
                                    </FormLabel>
                                    <Controller 
                                        name="cep" 
                                        control={control}
                                        rules={{
                                            pattern: {
                                                value: /^\d{5}-?\d{3}$/,
                                                message: "CEP inválido"
                                            }
                                        }}
                                        render={({ field }) => (
                                            <InputGroup>
                                                <FormControl 
                                                    type="text" 
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        handleCepChange(e.target.value);
                                                    }}
                                                    isInvalid={errors.cep || cepError}
                                                    placeholder="00000-000"
                                                    maxLength={9}
                                                    disabled={lookingUpCep}
                                                />
                                                {lookingUpCep && (
                                                    <InputGroup.Text>
                                                        <Spinner animation="border" size="sm" />
                                                    </InputGroup.Text>
                                                )}
                                                {(errors.cep || cepError) && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.cep?.message || cepError}
                                                    </Form.Control.Feedback>
                                                )}
                                            </InputGroup>
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                            
                            <Col md={8}>
                                <FormGroup>
                                    <FormLabel>Endereço</FormLabel>
                                    <Controller 
                                        name="endereco" 
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl 
                                                type="text" 
                                                {...field}
                                                placeholder="Rua, número, complemento"
                                                readOnly={lookingUpCep}
                                            />
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row className="mt-3">
                            <Col md={8}>
                                <FormGroup>
                                    <FormLabel>Cidade</FormLabel>
                                    <Controller 
                                        name="cidade" 
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl 
                                                type="text" 
                                                {...field}
                                                placeholder="Cidade"
                                                readOnly={lookingUpCep}
                                            />
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                            
                            <Col md={4}>
                                <FormGroup>
                                    <FormLabel>Estado</FormLabel>
                                    <Controller 
                                        name="estado" 
                                        control={control}
                                        render={({ field }) => (
                                            <Form.Select 
                                                {...field}
                                                disabled={lookingUpCep}
                                                className={errors.estado ? "is-invalid" : ""}
                                            >
                                                <option value="">Selecione</option>
                                                <option value="AC">AC - Acre</option>
                                                <option value="AL">AL - Alagoas</option>
                                                <option value="AP">AP - Amapá</option>
                                                <option value="AM">AM - Amazonas</option>
                                                <option value="BA">BA - Bahia</option>
                                                <option value="CE">CE - Ceará</option>
                                                <option value="DF">DF - Distrito Federal</option>
                                                <option value="ES">ES - Espírito Santo</option>
                                                <option value="GO">GO - Goiás</option>
                                                <option value="MA">MA - Maranhão</option>
                                                <option value="MT">MT - Mato Grosso</option>
                                                <option value="MS">MS - Mato Grosso do Sul</option>
                                                <option value="MG">MG - Minas Gerais</option>
                                                <option value="PA">PA - Pará</option>
                                                <option value="PB">PB - Paraíba</option>
                                                <option value="PR">PR - Paraná</option>
                                                <option value="PE">PE - Pernambuco</option>
                                                <option value="PI">PI - Piauí</option>
                                                <option value="RJ">RJ - Rio de Janeiro</option>
                                                <option value="RN">RN - Rio Grande do Norte</option>
                                                <option value="RS">RS - Rio Grande do Sul</option>
                                                <option value="RO">RO - Rondônia</option>
                                                <option value="RR">RR - Roraima</option>
                                                <option value="SC">SC - Santa Catarina</option>
                                                <option value="SP">SP - São Paulo</option>
                                                <option value="SE">SE - Sergipe</option>
                                                <option value="TO">TO - Tocantins</option>
                                            </Form.Select>
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <Form.Text className="text-muted">
                            <FaInfoCircle className="me-1" />
                            Digite o CEP para preenchimento automático do endereço
                        </Form.Text>
                    </div>

                    {/* Seção de Voucher */}
                    <div className="border rounded p-3 mb-3">
                        <h6 className="text-primary mb-3">
                            <FaTicketAlt className="me-2" />
                            Configuração do Voucher
                        </h6>
                        
                        <Row>
                            <Col md={4}>
                                <FormGroup>
                                    <FormLabel>
                                        <FaPercent className="me-1" />
                                        Desconto *
                                    </FormLabel>
                                    <Controller 
                                        name="desconto" 
                                        control={control}
                                        rules={{ 
                                            required: "Desconto é obrigatório",
                                            min: { value: 1, message: "Mínimo 1%" },
                                            max: { value: 100, message: "Máximo 100%" }
                                        }}
                                        render={({ field }) => (
                                            <InputGroup>
                                                <FormControl 
                                                    type="number" 
                                                    {...field}
                                                    isInvalid={errors.desconto}
                                                    placeholder="10"
                                                />
                                                <InputGroup.Text>%</InputGroup.Text>
                                                {errors.desconto && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.desconto.message}
                                                    </Form.Control.Feedback>
                                                )}
                                            </InputGroup>
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                            
                            <Col md={8}>
                                <FormGroup>
                                    <FormLabel className="d-flex align-items-center">
                                        <FaTicketAlt className="me-1" />
                                        Código do Voucher
                                        {generatingVoucher && (
                                            <Spinner animation="border" size="sm" className="ms-2" />
                                        )}
                                    </FormLabel>
                                    <Controller 
                                        name="voucher_codigo" 
                                        control={control}
                                        render={({ field }) => (
                                            <InputGroup>
                                                <FormControl 
                                                    type="text" 
                                                    {...field}
                                                    placeholder={generatingVoucher ? "Gerando código único..." : "Código será gerado automaticamente"}
                                                    readOnly={!parceiro}
                                                />
                                                {field.value && (
                                                    <InputGroup.Text className="bg-success text-white">
                                                        <FaCheckCircle className="me-1" />
                                                        Válido
                                                    </InputGroup.Text>
                                                )}
                                            </InputGroup>
                                        )}
                                    />
                                    <Form.Text className="text-muted">
                                        {!parceiro && "Código gerado automaticamente baseado no nome e desconto"}
                                    </Form.Text>
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row className="mt-3">
                            <Col md={12}>
                                <FormGroup>
                                    <Controller
                                        name="limitar_voucher"
                                        control={control}
                                        render={({ field }) => (
                                            <Form.Check
                                                type="switch"
                                                id="limitar-switch"
                                                label={
                                                    <span>
                                                        Limitar uso do voucher
                                                        <Badge bg="info" className="ms-2">Opcional</Badge>
                                                    </span>
                                                }
                                                checked={field.value}
                                                onChange={(e) => field.onChange(e.target.checked)}
                                            />
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        {limitarVoucher && (
                            <Row className="mt-2">
                                <Col md={6}>
                                    <FormGroup>
                                        <FormLabel className="text-muted small">
                                            Quantas vezes cada cliente pode usar em 30 dias?
                                        </FormLabel>
                                        <Controller
                                            name="limite_uso"
                                            control={control}
                                            rules={{ 
                                                required: limitarVoucher ? "Informe o limite" : false,
                                                min: { value: 1, message: "Mínimo 1 uso" }
                                            }}
                                            render={({ field }) => (
                                                <>
                                                    <InputGroup>
                                                        <FormControl 
                                                            type="number" 
                                                            {...field}
                                                            isInvalid={errors.limite_uso}
                                                            placeholder="Ex: 3"
                                                        />
                                                        <InputGroup.Text>vezes</InputGroup.Text>
                                                    </InputGroup>
                                                    {errors.limite_uso && (
                                                        <Form.Control.Feedback type="invalid" className="d-block">
                                                            {errors.limite_uso.message}
                                                        </Form.Control.Feedback>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        )}
                    </div>

                    {/* Seção de Imagem */}
                    <div className="border rounded p-3 mb-3">
                        <h6 className="text-primary mb-3">
                            <FaImage className="me-2" />
                            Logo/Foto (Opcional)
                        </h6>
                        
                        <div {...getRootProps()} className={`dropzone p-3 border-2 border-dashed rounded text-center ${isDragActive ? 'bg-light' : ''}`}>
                            <input {...getInputProps()} />
                            {fotoPreview && (
                                <img 
                                    src={fotoPreview} 
                                    alt="Preview" 
                                    className="mb-2" 
                                    style={{ maxHeight: "100px", borderRadius: "8px" }}
                                />
                            )}
                            <p className="mb-0 text-muted small">
                                {isDragActive ? 
                                    "Solte a imagem aqui..." : 
                                    "Clique ou arraste uma imagem (máx. 2MB)"
                                }
                            </p>
                        </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                        <Button 
                            variant="outline-secondary" 
                            onClick={handleClose} 
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            disabled={loading || generatingVoucher}
                        >
                            {loading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Salvando...
                                </>
                            ) : (
                                parceiro ? "Salvar Alterações" : "Criar Parceiro"
                            )}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
};

export default ParceiroModal;