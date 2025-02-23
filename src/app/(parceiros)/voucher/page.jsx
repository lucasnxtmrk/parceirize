'use client';

import { useState, useEffect } from 'react';
import { Container, Row } from 'react-bootstrap';
import VoucherCard from './components/VoucherCard';


const VoucherPage = () => {
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVoucherData = async () => {
            try {
                // Simulação de dados da API (substitua pela chamada real quando a API estiver pronta)
                const mockVoucherData = {  // Dados estáticos - SIMULANDO a API
                    nome: "Nextmark Comunicação",
                    descricao: "20% de desconto",
                    codigo: "NXT20",
                    validade: "31/12/2024",
                };

                // Simula uma chamada de API (substitua pela chamada real quando a API estiver pronta)
                const simulateApiCall = new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({ voucher: mockVoucherData }); // SIMULANDO a resposta da API
                    }, 500); // Simula um atraso de 500ms
                });

                // Aqui você usará o fetch real quando a API estiver pronta:
                /*
                const response = await fetch('/api/voucher');
                if (!response.ok) {
                    throw new Error(`Erro ao buscar voucher: ${response.status}`);
                }
                const data = await response.json();
                */

                simulateApiCall.then(data => { // Quando a API estiver pronta, remova o simulateApiCall e use o fetch acima.
                    setVoucher(data.voucher);
                    setLoading(false);
                }).catch(err => {
                    setError(err);
                    setLoading(false);
                });


            } catch (err) {
                setError(err);
                console.error("Erro na requisição:", err); // Mensagem de erro mais informativa
            } finally {
                setLoading(false);
            }
        };

        fetchVoucherData();
    }, []);

    if (loading) {
        return <div className="text-center">Carregando voucher...</div>; // Centralizado
    }

    if (error) {
        return <div className="text-center text-danger">Erro ao carregar voucher: {error.message}</div>; // Mensagem de erro em vermelho
    }

    if (!voucher) {
        return <div className="text-center">Nenhum voucher encontrado.</div>; // Centralizado
    }

    return (
       
        <Row> {/* Removida a classe justify-content-center */}
            <VoucherCard voucher={voucher} />
        </Row>
    );
};

export default VoucherPage;