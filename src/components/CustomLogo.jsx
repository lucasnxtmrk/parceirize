'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export default function CustomLogo({ fallbackSrc, fallbackAlt = "Logo", className = "", style = {} }) {
    const { data: session } = useSession();
    const [customLogo, setCustomLogo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session?.user?.role === 'provedor') {
            loadCustomLogo();
        } else {
            setLoading(false);
        }

        // Escutar eventos de atualização de logo
        const handleLogoUpdate = (event) => {
            if (event.detail?.logo_url) {
                setCustomLogo(event.detail.logo_url);
            }
        };

        window.addEventListener('logoUpdate', handleLogoUpdate);
        
        return () => {
            window.removeEventListener('logoUpdate', handleLogoUpdate);
        };
    }, [session]);

    const loadCustomLogo = async () => {
        try {
            const response = await fetch('/api/admin/customizacao');
            if (response.ok) {
                const customization = await response.json();
                if (customization.logo_url) {
                    setCustomLogo(customization.logo_url);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar logo personalizado:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        // Placeholder enquanto carrega
        return (
            <div 
                className={`${className} d-flex align-items-center justify-content-center`}
                style={{ ...style, backgroundColor: '#f8f9fa' }}
            >
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </div>
            </div>
        );
    }

    if (customLogo) {
        return (
            <img
                src={customLogo}
                alt="Logo Personalizado"
                className={className}
                style={style}
                onError={(e) => {
                    // Se der erro, usa o fallback
                    e.target.src = fallbackSrc;
                    e.target.alt = fallbackAlt;
                }}
            />
        );
    }

    // Se não tem logo personalizado, usa o fallback
    return (
        <Image
            src={fallbackSrc}
            alt={fallbackAlt}
            className={className}
            style={style}
            width={style?.width ? parseInt(style.width) : undefined}
            height={style?.height ? parseInt(style.height) : undefined}
        />
    );
}