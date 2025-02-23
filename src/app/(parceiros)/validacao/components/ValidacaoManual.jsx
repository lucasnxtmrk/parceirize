'use client';

import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';

const ValidacaoManual = () => {
    const [clientId, setClientId] = useState('');
    const [couponCode, setCouponCode] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Aqui você pode validar os dados (clientId e couponCode)
        console.log('Validar manualmente:', clientId, couponCode);
    };

    return (
        <Form onSubmit={handleSubmit}>
            <Form.Group controlId="clientId">
                <Form.Label>ID do Cliente</Form.Label>
                <Form.Control
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                />
            </Form.Group>
            <Form.Group controlId="couponCode">
                <Form.Label>Código do Cupom</Form.Label>
                <Form.Control
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                />
            </Form.Group>
            <Button type="submit">Validar</Button>
        </Form>
    );
};

export default ValidacaoManual;