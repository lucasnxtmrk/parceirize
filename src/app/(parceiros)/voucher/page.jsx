"use client";

import { useState, useEffect } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Row, CardTitle } from 'react-bootstrap';
import VoucherCard from './components/VoucherCard';

const VoucherPage = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVoucherData = async () => {
            try {
                const response = await fetch('/api/parceiro/voucher');
    
                if (!response.ok) {
                    throw new Error(`Erro ao buscar voucher: ${response.status}`);
                }
    
                const data = await response.json();
    
                // ✅ Agora pegamos apenas a lista de vouchers corretamente
                setVouchers(data.vouchers || []); 
                setLoading(false);
    
            } catch (err) {
                setError(err);
                console.error("❌ Erro na requisição:", err);
            } finally {
                setLoading(false);
            }
        };
    
        fetchVoucherData();
    }, []);

    return (
        <ComponentContainerCard id="vouchers-parceiro">
            {/* Cabeçalho: Título */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle as="h4" className="mb-0">Meus Vouchers</CardTitle>
            </div>

            {loading ? (
                <div className="text-center">Carregando vouchers...</div>
            ) : error ? (
                <div className="text-center text-danger">Erro ao carregar vouchers: {error.message}</div>
            ) : vouchers.length === 0 ? (
                <div className="text-center">Nenhum voucher encontrado.</div>
            ) : (
                <Row>
                    {vouchers.map((voucher, idx) => (
                        <VoucherCard key={idx} voucher={voucher} />
                    ))}
                </Row>
            )}
        </ComponentContainerCard>
    );
};

export default VoucherPage;
