"use client";

import { useState } from "react";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import { Card, CardBody, Form, Button, CardTitle } from "react-bootstrap";
import { useToast } from "@/components/ui/Toast";

const ValidacaoAdmin = () => {
    const [clientId, setClientId] = useState("");
    const [couponCode, setCouponCode] = useState("");
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // Envolvendo o conteúdo com ComponentContainerCard

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/admin/validarVoucher", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ clientId, couponCode }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Voucher Validado!", data.message);
                setClientId("");
                setCouponCode("");
            } else {
                toast.error("Erro na Validação", data.error || "Erro ao validar o voucher.");
            }
        } catch (err) {
            console.error("❌ Erro na requisição:", err);
            toast.error("Erro no Sistema", "Erro ao validar o voucher. Tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ComponentContainerCard id="admin-validacao">
            {/* Cabeçalho: Título */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle as="h4" className="mb-0">Validação de Vouchers</CardTitle>
            </div>


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
                <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? "Validando..." : "Validar"}
                </Button>
            </Form>
        </ComponentContainerCard>
    );
};

export default ValidacaoAdmin;
