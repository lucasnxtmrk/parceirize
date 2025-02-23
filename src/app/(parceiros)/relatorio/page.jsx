'use client';

import { useState, useEffect } from 'react';
import { Container, Row } from 'react-bootstrap';
import NestingTable2 from './components/NestingTable2'; // Importe o componente

const VoucherReportPage = () => {
    const [vouchersUtilizados, setVouchersUtilizados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Simulação de dados da API (substitua pelos dados reais quando a API estiver pronta)
        const mockVouchersUtilizados = [
            { codigo: 'NXT20', cliente: 'João Silva', dataUtilizacao: '10/05/2024 10:00', valorDesconto: '20%' },
            { codigo: 'NXT20', cliente: 'Maria Souza', dataUtilizacao: '12/05/2024 15:30', valorDesconto: '20%' },
            // ... mais dados
        ];

        // Simula uma chamada de API (substitua pela chamada real quando a API estiver pronta)
        const simulateApiCall = new Promise((resolve) => {
            setTimeout(() => {
                resolve({ vouchers: mockVouchersUtilizados });
            }, 500);
        });

        simulateApiCall.then(data => {
            setVouchersUtilizados(data.vouchers);
            setLoading(false);
        }).catch(err => {
            setError(err);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="text-center">Carregando dados...</div>;
    }

    if (error) {
        return <div className="text-center text-danger">Erro ao carregar dados: {error.message}</div>;
    }

    return (
        
            <Row>
                <NestingTable2 vouchersUtilizados={vouchersUtilizados} /> {/* Passe os dados para o componente */}
            </Row>
        
    );
};

export default VoucherReportPage;