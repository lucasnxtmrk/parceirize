"use client";

import { useState, useEffect } from "react";
import { Row } from "react-bootstrap";
import VouchersUtilizadosTable from "./components/VouchersUtilizadosTable";

const RelatoriosPage = () => {
    const [vouchersUtilizados, setVouchersUtilizados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVouchersUtilizados = async () => {
            try {
                const response = await fetch("/api/admin/relatorios/vouchers-utilizados");

                if (!response.ok) {
                    throw new Error(`Erro ao buscar vouchers utilizados: ${response.status}`);
                }

                const data = await response.json();
                setVouchersUtilizados(data);
                setLoading(false);
            } catch (err) {
                console.error("❌ Erro na requisição:", err);
                setError(err);
                setLoading(false);
            }
        };

        fetchVouchersUtilizados();
    }, []);

    if (loading) {
        return <div className="text-center">Carregando dados...</div>;
    }

    if (error) {
        return <div className="text-center text-danger">Erro ao carregar dados: {error.message}</div>;
    }

    return (
        <Row>
            <VouchersUtilizadosTable vouchersUtilizados={vouchersUtilizados} />
        </Row>
    );
};

export default RelatoriosPage;
