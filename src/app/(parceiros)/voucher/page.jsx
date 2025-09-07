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
            <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle as="h4" className="mb-0">Meu Cupom Geral</CardTitle>
            </div>

            {/* Explicação clara */}
            <div className="alert alert-info d-flex align-items-start gap-2 mb-4">
                <i className="bi bi-info-circle-fill"></i>
                <div>
                    <strong>💡 Sobre o Cupom Geral:</strong><br />
                    <small>
                        Aqui você cria um cupom único que funciona para QUALQUER coisa da sua loja/serviço, 
                        mesmo itens que não estão no catálogo de produtos. O cliente usa o QR Code presencialmente.
                        <br /><strong>Exemplo:</strong> "15% off em qualquer serviço ou produto"
                    </small>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                    <p className="mt-3 text-muted">Carregando seu cupom geral...</p>
                </div>
            ) : error ? (
                <div className="text-center text-danger py-5">
                    <i className="bi bi-exclamation-triangle display-1"></i>
                    <h5 className="mt-3">Erro ao carregar vouchers</h5>
                    <p>{error.message}</p>
                </div>
            ) : vouchers.length === 0 ? (
                <div className="text-center py-5">
                    <i className="bi bi-ticket display-1 text-muted"></i>
                    <h5 className="mt-3">Nenhum cupom configurado</h5>
                    <p className="text-muted">Configure seu primeiro cupom geral para oferecer descontos aos clientes.</p>
                </div>
            ) : (
                <Row>
                    {vouchers.map((voucher, idx) => (
                        <VoucherCard 
                            key={idx} 
                            voucher={voucher} 
                            onUpdate={() => window.location.reload()}
                        />
                    ))}
                </Row>
            )}
        </ComponentContainerCard>
    );
};

export default VoucherPage;
