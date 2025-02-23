'use client';

import { useState } from 'react';
import { Container, Card, CardBody, Form, Button } from 'react-bootstrap';

const Validacao = () => {
    const [clientId, setClientId] = useState('');
    const [couponCode, setCouponCode] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Aqui você pode validar os dados (clientId e couponCode)
        console.log('Validar manualmente:', clientId, couponCode);

        // Lógica de validação e envio para o servidor
        fetch('/api/validarVoucher', { // Substitua pela sua API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ clientId, couponCode }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Voucher validado com sucesso!");
                setClientId(''); // Limpa os campos após a validação
                setCouponCode('');
            } else {
                alert(data.message || "Erro ao validar o voucher.");
            }
        })
        .catch(error => {
            console.error("Erro na requisição:", error);
            alert("Erro ao validar o voucher. Tente novamente mais tarde.");
        });

    };

    return (
            <Card>
                <CardBody>
                    <h2>Validação de Vouchers</h2>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="clientId">
                            <Form.Label>ID do Cliente</Form.Label>
                            <Form.Control
                                type="text"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                required // Adicione a validação de campo obrigatório
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="couponCode">
                            <Form.Label>Código do Cupom</Form.Label>
                            <Form.Control
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                required // Adicione a validação de campo obrigatório
                            />
                        </Form.Group>
                        <Button type="submit">Validar</Button>
                    </Form>
                </CardBody>
            </Card>
    );
};

export default Validacao;