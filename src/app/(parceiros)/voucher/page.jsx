"use client";

import { useState, useEffect } from 'react';
import { Row } from 'react-bootstrap';
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

    if (loading) {
        return <div className="text-center">Carregando voucher...</div>;
    }

    if (error) {
        return <div className="text-center text-danger">Erro ao carregar voucher: {error.message}</div>;
    }

    if (vouchers.length === 0) {
        return <div className="text-center">Nenhum voucher encontrado.</div>;
    }

    return (
        <Row>
            {vouchers.map((voucher, idx) => (
                <VoucherCard key={idx} voucher={voucher} />
            ))}
        </Row>
    );
};

export default VoucherPage;
