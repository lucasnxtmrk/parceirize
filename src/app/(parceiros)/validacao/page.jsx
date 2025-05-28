"use client";

import { useState } from 'react';
import { Card, CardBody, Form, Button, Alert } from 'react-bootstrap';

const Validacao = () => {
    const [clientId, setClientId] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/validarVoucher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clientId, couponCode }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setClientId('');
                setCouponCode('');
            } else {
                setError(data.error || "Erro ao validar o voucher.");
            }
        } catch (err) {
            console.error("❌ Erro na requisição:", err);
            setError("Erro ao validar o voucher. Tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardBody>
                <h2>Validação de Vouchers</h2>

                {message && <Alert variant="success">{message}</Alert>}
                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="clientId">
                        <Form.Label>ID da Carteirinha do Cliente</Form.Label>
                        <Form.Control
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="couponCode">
                        <Form.Label>Código do Voucher</Form.Label>
                        <Form.Control
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Validando..." : "Validar"}
                    </Button>
                </Form>
            </CardBody>
        </Card>
    );
};

export default Validacao;
