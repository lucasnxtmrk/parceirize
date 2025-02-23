'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Corrigindo o dynamic import para carregar corretamente o componente
const QrReader = dynamic(() => import('react-qr-reader').then(mod => mod.default), { ssr: false });

const ValidacaoQrCode = () => {
    const [qrData, setQrData] = useState(null);
    const [error, setError] = useState(null);
    const [validacao, setValidacao] = useState(null);

    const handleScan = async (data) => {
        if (data) {
            setQrData(data);
            await validarVoucher(data);
        }
    };

    const handleError = (err) => {
        console.error('Erro ao ler QR Code:', err);
        setError('Erro ao acessar a câmera. Verifique as permissões.');
    };

    const validarVoucher = async (codigo) => {
        try {
            const response = await fetch('/api/validar-voucher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo }),
            });

            const data = await response.json();
            setValidacao(data.mensagem);
        } catch (error) {
            setValidacao('Erro ao validar o voucher.');
        }
    };

    return (
        <div className="qr-code-reader">
            <QrReader
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: '100%' }}
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {qrData && <p>ID do Cliente: {qrData}</p>}
            {validacao && <p style={{ color: validacao.includes('válido') ? 'green' : 'red' }}>{validacao}</p>}
        </div>
    );
};

export default ValidacaoQrCode;
