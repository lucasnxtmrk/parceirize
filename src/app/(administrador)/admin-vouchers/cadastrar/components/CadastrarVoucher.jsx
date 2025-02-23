'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, Card, CardBody, Col, Form, Row } from 'react-bootstrap';
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/light.css"; // Importe os estilos do Flatpickr
import Choices from 'choices.js';
import 'choices.js/public/assets/styles/choices.min.css';
import { useEffect, useRef } from 'react';

const voucherSchema = yup.object().shape({
    codigo: yup.string().required('O código do voucher é obrigatório'),
    descricao: yup.string().required('A descrição do voucher é obrigatória'),
    valorDesconto: yup
        .number()
        .typeError('O valor do desconto deve ser um número')
        .required('O valor do desconto é obrigatório')
        .positive('O valor do desconto deve ser positivo'),
    dataValidade: yup.date().required('A data de validade é obrigatória'),
    quantidade: yup
        .number()
        .typeError('A quantidade deve ser um número')
        .required('A quantidade é obrigatória')
        .integer('A quantidade deve ser um número inteiro')
        .positive('A quantidade deve ser positiva'),
    condicoes: yup.string(), // Campo opcional
});

const CadastrarVoucher = () => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(voucherSchema),
    });

    const [dataValidade, setDataValidade] = useState(new Date()); // Estado para data de validade
    const [selectedItems, setSelectedItems] = useState([]);
    const choicesRef = useRef(null);

    useEffect(() => {
        if (choicesRef.current) {
            const choices = new Choices(choicesRef.current, {
                placeholder: true,
                allowHTML: true,
                shouldSort: false
            });
            choices.passedElement.element.addEventListener('change', e => {
                if (!(e.target instanceof HTMLSelectElement)) return;
                setSelectedItems(Array.from(e.target.selectedOptions, option => option.value));
            });
        }
    }, [choicesRef]);

    const onSubmit = (data) => {
        // Aqui você pode enviar os dados do formulário para o servidor
        console.log(data);
        alert('Voucher cadastrado com sucesso!'); // Exibe um alerta (substitua por uma notificação mais elegante)
    };

    return (
        <Card>
            <CardBody>
                <Card.Title>Cadastrar Voucher</Card.Title>
                <Form onSubmit={handleSubmit(onSubmit)}>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3" controlId="codigo">
                                <Form.Label>Código</Form.Label>
                                <Form.Control type="text" {...register('codigo')} isInvalid={!!errors.codigo} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.codigo?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3" controlId="descricao">
                                <Form.Label>Descrição</Form.Label>
                                <Form.Control type="text" {...register('descricao')} isInvalid={!!errors.descricao} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.descricao?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3" controlId="valorDesconto">
                                <Form.Label>Valor do Desconto</Form.Label>
                                <Form.Control type="number" {...register('valorDesconto')} isInvalid={!!errors.valorDesconto} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.valorDesconto?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3" controlId="dataValidade">
                                <Form.Label>Data de Validade</Form.Label>
                                <Flatpickr
                                    value={dataValidade}
                                    onChange={([date]) => setDataValidade(date)}
                                    options={{
                                        enableTime: false, // Desabilita a seleção de hora
                                        dateFormat: "d/m/Y", // Formato de data brasileiro
                                    }}
                                    className="form-control"
                                />
                                {errors.dataValidade && <div className="invalid-feedback">{errors.dataValidade.message}</div>}

                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3" controlId="quantidade">
                                <Form.Label>Quantidade</Form.Label>
                                <Form.Control type="number" {...register('quantidade')} isInvalid={!!errors.quantidade} />
                                <Form.Control.Feedback type="invalid">
                                    {errors.quantidade?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3" controlId="condicoes">
                                <Form.Label>Condições (Opcional)</Form.Label>
                                <Form.Control as="textarea" rows={3} {...register('condicoes')} />
                            </Form.Group>
                        </Col>
                    </Row>


                    <Button type="submit" variant="primary" className="w-100">
                        Cadastrar
                    </Button>
                </Form>
            </CardBody>
        </Card>
    );
};

export default CadastrarVoucher;