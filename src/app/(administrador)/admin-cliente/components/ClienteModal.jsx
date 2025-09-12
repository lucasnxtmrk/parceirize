"use client";

import React, { useState, useEffect } from "react";
import { Button, Modal, Form, FormControl, FormGroup, FormLabel, Alert, InputGroup, Row, Col, Badge, Spinner, Card } from "react-bootstrap";
import { useForm, Controller } from "react-hook-form";
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaCopy, FaUserPlus, FaEdit, FaMapMarkerAlt } from "react-icons/fa";
import { geocodeByCep, formatCep, cleanCep, isValidCep } from "@/lib/geocoding";

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
    const { control, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
        defaultValues: {
            nome: "",
            sobrenome: "",
            email: "",
            senha: "",
            confirmarSenha: "",
            id_carteirinha: "",
            cep: "",
            endereco: "",
            cidade: "",
            estado: "",
        },
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [generatingId, setGeneratingId] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [lookingUpCep, setLookingUpCep] = useState(false);
    const [cepError, setCepError] = useState(null);
    const isEditMode = Boolean(cliente);
    
    const senha = watch("senha");
    const carteirinhaId = watch("id_carteirinha");
    const cep = watch("cep");

    useEffect(() => {
        if (show) {
            reset();
            setError(null);
            setSuccess(null);
            setCopied(false);

            if (isEditMode) {
                setValue("nome", cliente.nome);
                setValue("sobrenome", cliente.sobrenome);
                setValue("email", cliente.email);
                setValue("id_carteirinha", cliente.id_carteirinha || "N/A");
                setValue("cep", cliente.cep || "");
                setValue("endereco", cliente.endereco || "");
                setValue("cidade", cliente.cidade || "");
                setValue("estado", cliente.estado || "");
            } else {
                setGeneratingId(true);
                setValue("id_carteirinha", "");
                generateUniqueId().then((uniqueId) => {
                    setValue("id_carteirinha", uniqueId);
                    setGeneratingId(false);
                });
            }
        }
    }, [show, cliente, setValue, reset, isEditMode]);

    const handleCopyId = () => {
        if (carteirinhaId && carteirinhaId !== "Gerando...") {
            navigator.clipboard.writeText(carteirinhaId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

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

    const onSubmit = async (formData) => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Validação extra de senha em novo cadastro
        if (!isEditMode && formData.senha !== formData.confirmarSenha) {
            setError("As senhas não coincidem");
            setLoading(false);
            return;
        }

        const method = isEditMode ? "PUT" : "POST";
        const url = "/api/admin/clientes";

        try {
            // Remove confirmarSenha do payload
            const { confirmarSenha, ...dataToSend } = formData;
            
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isEditMode ? { ...dataToSend, id: cliente.id } : dataToSend),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao salvar cliente");
            }

            setSuccess(isEditMode ? "Cliente atualizado com sucesso!" : "Cliente criado com sucesso!");
            
            setTimeout(() => {
                onClientCreated();
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
                    {isEditMode ? (
                        <>
                            <FaEdit className="me-2" />
                            Editar Cliente
                        </>
                    ) : (
                        <>
                            <FaUserPlus className="me-2" />
                            Cadastrar Novo Cliente
                        </>
                    )}
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
                    {/* Seção de Dados Pessoais */}
                    <div className="border rounded p-3 mb-3">
                        <h6 className="text-primary mb-3">
                            <FaInfoCircle className="me-2" />
                            Dados Pessoais
                        </h6>
                        
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <FormLabel>
                                        <FaUser className="me-1" />
                                        Nome *
                                    </FormLabel>
                                    <Controller 
                                        name="nome" 
                                        control={control}
                                        rules={{ 
                                            required: "Nome é obrigatório",
                                            minLength: { value: 2, message: "Mínimo 2 caracteres" },
                                            pattern: {
                                                value: /^[A-Za-zÀ-ÿ\s]+$/,
                                                message: "Nome deve conter apenas letras"
                                            }
                                        }}
                                        render={({ field }) => (
                                            <>
                                                <FormControl 
                                                    type="text" 
                                                    {...field}
                                                    isInvalid={errors.nome}
                                                    placeholder="João"
                                                />
                                                {errors.nome && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.nome.message}
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
                                        <FaUser className="me-1" />
                                        Sobrenome *
                                    </FormLabel>
                                    <Controller 
                                        name="sobrenome" 
                                        control={control}
                                        rules={{ 
                                            required: "Sobrenome é obrigatório",
                                            minLength: { value: 2, message: "Mínimo 2 caracteres" },
                                            pattern: {
                                                value: /^[A-Za-zÀ-ÿ\s]+$/,
                                                message: "Sobrenome deve conter apenas letras"
                                            }
                                        }}
                                        render={({ field }) => (
                                            <>
                                                <FormControl 
                                                    type="text" 
                                                    {...field}
                                                    isInvalid={errors.sobrenome}
                                                    placeholder="Silva"
                                                />
                                                {errors.sobrenome && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.sobrenome.message}
                                                    </Form.Control.Feedback>
                                                )}
                                            </>
                                        )}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row className="mt-3">
                            <Col md={12}>
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
                                                    placeholder="joao.silva@email.com"
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
                    </div>

                    {/* Seção de Endereço */}
                    <div className="border rounded p-3 mb-3">
                        <h6 className="text-primary mb-3">
                            <FaMapMarkerAlt className="me-2" />
                            Endereço
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
                                            <FormControl 
                                                as="select" 
                                                {...field}
                                                disabled={lookingUpCep}
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
                                            </FormControl>
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

                    {/* Seção de Segurança - Apenas para novo cadastro */}
                    {!isEditMode && (
                        <div className="border rounded p-3 mb-3">
                            <h6 className="text-primary mb-3">
                                <FaLock className="me-2" />
                                Segurança
                            </h6>
                            
                            <Row>
                                <Col md={6}>
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
                                                minLength: { value: 6, message: "Mínimo 6 caracteres" },
                                                pattern: {
                                                    value: /^(?=.*[A-Za-z])(?=.*\d)/,
                                                    message: "Deve conter letras e números"
                                                }
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
                                                        type="button"
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
                                </Col>
                                
                                <Col md={6}>
                                    <FormGroup>
                                        <FormLabel>
                                            <FaLock className="me-1" />
                                            Confirmar Senha *
                                        </FormLabel>
                                        <Controller 
                                            name="confirmarSenha" 
                                            control={control}
                                            rules={{ 
                                                required: "Confirmação é obrigatória",
                                                validate: value => value === senha || "Senhas não coincidem"
                                            }}
                                            render={({ field }) => (
                                                <>
                                                    <FormControl 
                                                        type={showPassword ? "text" : "password"}
                                                        {...field}
                                                        isInvalid={errors.confirmarSenha}
                                                        placeholder="Digite a senha novamente"
                                                    />
                                                    {errors.confirmarSenha && (
                                                        <Form.Control.Feedback type="invalid">
                                                            {errors.confirmarSenha.message}
                                                        </Form.Control.Feedback>
                                                    )}
                                                </>
                                            )}
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            
                            <Alert variant="info" className="mt-3 small mb-0">
                                <FaInfoCircle className="me-1" />
                                A senha deve conter letras e números para maior segurança
                            </Alert>
                        </div>
                    )}

                    {/* Seção da Carteirinha */}
                    <div className="border rounded p-3 mb-3">
                        <h6 className="text-primary mb-3">
                            <FaIdCard className="me-2" />
                            Carteirinha Digital
                        </h6>
                        
                        <FormGroup>
                            <FormLabel className="d-flex align-items-center">
                                ID da Carteirinha
                                {generatingId && (
                                    <Spinner animation="border" size="sm" className="ms-2" />
                                )}
                                {!isEditMode && !generatingId && (
                                    <Badge bg="success" className="ms-2">Gerado Automaticamente</Badge>
                                )}
                            </FormLabel>
                            <Controller 
                                name="id_carteirinha" 
                                control={control}
                                render={({ field }) => (
                                    <InputGroup>
                                        <FormControl 
                                            type="text" 
                                            {...field} 
                                            readOnly
                                            placeholder={generatingId ? "Gerando ID único..." : ""}
                                            className="font-monospace fw-bold"
                                        />
                                        {field.value && !generatingId && (
                                            <Button
                                                variant="outline-secondary"
                                                onClick={handleCopyId}
                                                type="button"
                                                title="Copiar ID"
                                            >
                                                <FaCopy />
                                                {copied && " Copiado!"}
                                            </Button>
                                        )}
                                    </InputGroup>
                                )}
                            />
                            <Form.Text className="text-muted">
                                Este ID será usado para acessar a carteirinha digital do clube
                            </Form.Text>
                        </FormGroup>
                        
                        {!isEditMode && (
                            <Card className="bg-light mt-3">
                                <Card.Body className="py-2">
                                    <small className="text-muted">
                                        <FaInfoCircle className="me-1" />
                                        O cliente receberá este ID por e-mail após o cadastro
                                    </small>
                                </Card.Body>
                            </Card>
                        )}
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
                            disabled={loading || generatingId}
                        >
                            {loading ? (
                                <>
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Salvando...
                                </>
                            ) : (
                                isEditMode ? "Salvar Alterações" : "Criar Cliente"
                            )}
                        </Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
};

export default ClienteModal;