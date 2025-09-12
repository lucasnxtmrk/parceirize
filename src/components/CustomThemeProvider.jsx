'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function CustomThemeProvider({ children }) {
    const { data: session } = useSession();
    const [tenantClass, setTenantClass] = useState('');

    useEffect(() => {
        // Aplicar apenas para usuários logados que fazem parte de um tenant
        if (session?.user?.tenant_id) {
            const roles = ['provedor', 'cliente', 'parceiro'];
            if (roles.includes(session.user.role)) {
                // Primeiro, tentar carregar do cache para aplicação imediata
                loadFromCache();
                // Depois carregar da API para atualizar
                loadCustomTheme();
            }
        } else {
            // Limpar customização se não há tenant
            clearCustomTheme();
        }

        // Escutar eventos de atualização do tema
        const handleThemeUpdate = (event) => {
            const newCustomization = event.detail;
            if (newCustomization && session?.user?.tenant_id) {
                const tenantId = session.user.tenant_id.replace(/-/g, '');
                const className = `tenant-${tenantId}`;
                updateTenantStyles(className, newCustomization);
                // Atualizar cache
                sessionStorage.setItem('tenant-customization', JSON.stringify(newCustomization));
            }
        };

        window.addEventListener('themeUpdate', handleThemeUpdate);
        
        return () => {
            window.removeEventListener('themeUpdate', handleThemeUpdate);
        };
    }, [session]);

    const loadFromCache = () => {
        try {
            const cached = sessionStorage.getItem('tenant-customization');
            if (cached && session?.user?.tenant_id) {
                const customization = JSON.parse(cached);
                const tenantId = session.user.tenant_id.replace(/-/g, '');
                const className = `tenant-${tenantId}`;
                
                setTenantClass(className);
                document.body.className = document.body.className.replace(/tenant-\\w+/g, '');
                document.body.classList.add(className);
                updateTenantStyles(className, customization);
                
                console.log('🚀 Tema carregado do cache para aplicação imediata');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar tema do cache:', error);
        }
    };

    const loadCustomTheme = async () => {
        try {
            // Determinar qual API usar baseado no role
            let apiEndpoint = '/api/admin/customizacao'; // Default para provedor
            
            if (session?.user?.role === 'cliente') {
                apiEndpoint = '/api/cliente/customizacao'; // API para cliente
            } else if (session?.user?.role === 'parceiro') {
                apiEndpoint = '/api/parceiro/customizacao'; // API para parceiro
            }

            const response = await fetch(apiEndpoint);
            
            if (response.ok) {
                const customization = await response.json();
                
                if (customization.customization_available) {
                    // Criar classe CSS específica para este tenant
                    const tenantId = session.user.tenant_id.replace(/-/g, ''); // Remove hífens para CSS válido
                    const className = `tenant-${tenantId}`;
                    
                    setTenantClass(className);
                    
                    // Aplicar classe no body
                    document.body.className = document.body.className.replace(/tenant-\\w+/g, '');
                    document.body.classList.add(className);
                    
                    // Criar/atualizar estilos CSS específicos para este tenant
                    updateTenantStyles(className, customization);
                    
                    // Cache local para persistir durante a sessão
                    sessionStorage.setItem('tenant-customization', JSON.stringify(customization));
                    
                    console.log('🎨 Tema personalizado aplicado para tenant:', session.user.tenant_id);
                } else {
                    console.log('🔒 Customização não disponível para este plano');
                    clearCustomTheme();
                }
            } else if (response.status === 403) {
                // Plano não permite customização
                console.log('🔒 Customização restrita ao plano Enterprise');
                clearCustomTheme();
            }
        } catch (error) {
            console.error('❌ Erro ao carregar tema personalizado:', error);
            clearCustomTheme();
        }
    };

    const updateTenantStyles = (className, customization) => {
        // Remover estilos antigos deste tenant
        const existingStyle = document.getElementById(`tenant-styles-${className}`);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Verificar se há alguma customização válida
        const hasCustomization = 
            customization.cor_primaria || 
            customization.cor_secundaria || 
            customization.cor_fundo_menu ||
            customization.cor_texto_menu ||
            customization.cor_hover_menu ||
            customization.logo_url ||
            (customization.filtro_logo && customization.filtro_logo !== 'none');
        
        if (!hasCustomization) {
            console.log('🎨 Sem customização personalizada - usando tema padrão');
            // Limpar qualquer estilo anterior
            const existingClass = document.body.className.match(/tenant-\w+/);
            if (existingClass) {
                document.body.classList.remove(existingClass[0]);
            }
            return;
        }

        // Criar novos estilos CSS específicos para o tenant
        const style = document.createElement('style');
        style.id = `tenant-styles-${className}`;
        
        const css = `
            .${className} {
                --bs-primary: ${customization.cor_primaria} !important;
                --bs-primary-rgb: ${hexToRgb(customization.cor_primaria)} !important;
                --bs-secondary: ${customization.cor_secundaria} !important;
                --bs-secondary-rgb: ${hexToRgb(customization.cor_secundaria)} !important;
                ${customization.logo_url ? `--custom-logo-url: url('${customization.logo_url}');` : ''}
            }
            
            /* ===== BOTÕES ===== */
            .${className} .btn-primary {
                background-color: ${customization.cor_primaria} !important;
                border-color: ${customization.cor_primaria} !important;
            }
            
            .${className} .btn-primary:hover,
            .${className} .btn-primary:focus {
                background-color: ${darkenColor(customization.cor_primaria, 0.1)} !important;
                border-color: ${darkenColor(customization.cor_primaria, 0.1)} !important;
            }
            
            .${className} .btn-secondary {
                background-color: ${customization.cor_secundaria} !important;
                border-color: ${customization.cor_secundaria} !important;
            }
            
            .${className} .btn-secondary:hover,
            .${className} .btn-secondary:focus {
                background-color: ${darkenColor(customization.cor_secundaria, 0.1)} !important;
                border-color: ${darkenColor(customization.cor_secundaria, 0.1)} !important;
            }
            
            /* ===== MENU LATERAL / SIDEBAR ===== */
            .${className} .sidebar .nav-link.active,
            .${className} .main-nav .nav-link.active {
                background-color: ${customization.cor_primaria} !important;
                color: white !important;
            }
            
            .${className} .sidebar .nav-link:hover,
            .${className} .main-nav .nav-link:hover {
                background-color: ${lightenColor(customization.cor_primaria, 0.1)} !important;
                color: white !important;
            }
            
            /* ===== BACKGROUND DO MENU PRINCIPAL ===== */
            .${className} .main-nav {
                background-color: ${customization.cor_fundo_menu || '#f8f9fa'} !important;
                border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
            }
            
            /* ===== BACKGROUND DA ÁREA DA LOGO ===== */
            .${className} .main-nav .logo-box {
                background-color: ${customization.cor_fundo_menu || '#f8f9fa'} !important;
            }
            
            /* ===== TOPBAR - HARMONIZAR COM O MENU ===== */
            .${className} .topbar {
                border-bottom-color: ${customization.cor_fundo_menu || '#f8f9fa'} !important;
                border-top-color: ${customization.cor_fundo_menu || '#f8f9fa'} !important;
            }
            
            .${className} header {
                background: ${customization.cor_fundo_menu || '#f8f9fa'} !important;
            }
            
            /* ===== FILTROS DA LOGO PERSONALIZADOS ===== */
            .${className} .main-nav .logo-box .logo-lg,
            .${className} .main-nav .logo-box .logo-sm {
                filter: ${customization.filtro_logo || 'none'} !important;
            }
            
            /* ===== BORDA DIREITA DO CONTEÚDO (FUNDO ESCURO ADICIONAL) ===== */
            .${className} .page-content {
                border-right-color: ${customization.cor_fundo_menu || '#f8f9fa'} !important;
            }
            
            .${className} .nav-pills .nav-link.active {
                background-color: ${customization.cor_primaria} !important;
            }
            
            .${className} .nav-tabs .nav-link.active {
                color: ${customization.cor_primaria} !important;
                border-bottom-color: ${customization.cor_primaria} !important;
            }
            
            /* ===== MENU SUPERIOR / NAVBAR ===== */
            .${className} .navbar-brand {
                color: ${customization.cor_primaria} !important;
            }
            
            .${className} .navbar .nav-link:hover {
                color: ${customization.cor_primaria} !important;
            }
            
            .${className} .dropdown-item:hover {
                background-color: ${lightenColor(customization.cor_primaria, 0.2)} !important;
            }
            
            /* ===== LINKS E TEXTOS ===== */
            .${className} .text-primary {
                color: ${customization.cor_primaria} !important;
            }
            
            .${className} .text-secondary {
                color: ${customization.cor_secundaria} !important;
            }
            
            .${className} a {
                color: ${customization.cor_primaria} !important;
            }
            
            .${className} a:hover {
                color: ${darkenColor(customization.cor_primaria, 0.2)} !important;
            }
            
            /* ===== BACKGROUNDS ===== */
            .${className} .bg-primary {
                background-color: ${customization.cor_primaria} !important;
            }
            
            .${className} .bg-secondary {
                background-color: ${customization.cor_secundaria} !important;
            }
            
            /* ===== FORMULÁRIOS ===== */
            .${className} .form-check-input:checked {
                background-color: ${customization.cor_primaria} !important;
                border-color: ${customization.cor_primaria} !important;
            }
            
            .${className} .form-control:focus {
                border-color: ${customization.cor_primaria} !important;
                box-shadow: 0 0 0 0.2rem ${hexToRgba(customization.cor_primaria, 0.25)} !important;
            }
            
            .${className} .form-select:focus {
                border-color: ${customization.cor_primaria} !important;
                box-shadow: 0 0 0 0.2rem ${hexToRgba(customization.cor_primaria, 0.25)} !important;
            }
            
            /* ===== CARDS E COMPONENTES ===== */
            .${className} .card-header {
                background-color: ${lightenColor(customization.cor_primaria, 0.3)} !important;
            }
            
            .${className} .badge.bg-primary {
                background-color: ${customization.cor_primaria} !important;
            }
            
            .${className} .badge.bg-secondary {
                background-color: ${customization.cor_secundaria} !important;
            }
            
            /* ===== ALERTAS ===== */
            .${className} .alert-primary {
                color: ${darkenColor(customization.cor_primaria, 0.3)} !important;
                background-color: ${lightenColor(customization.cor_primaria, 0.4)} !important;
                border-color: ${lightenColor(customization.cor_primaria, 0.2)} !important;
            }
            
            /* ===== PROGRESSBAR ===== */
            .${className} .progress-bar {
                background-color: ${customization.cor_primaria} !important;
            }
            
            /* ===== PAGINAÇÃO ===== */
            .${className} .page-link {
                color: ${customization.cor_primaria} !important;
            }
            
            .${className} .page-item.active .page-link {
                background-color: ${customization.cor_primaria} !important;
                border-color: ${customization.cor_primaria} !important;
            }
            
            /* ===== BORDAS E DIVISORES ===== */
            .${className} .border-primary {
                border-color: ${customization.cor_primaria} !important;
            }
            
            .${className} .border-secondary {
                border-color: ${customization.cor_secundaria} !important;
            }
            
            /* ===== SPINNERS ===== */
            .${className} .spinner-border.text-primary {
                color: ${customization.cor_primaria} !important;
            }
            
            /* ===== COMPONENTES CUSTOMIZADOS (se houver) ===== */
            .${className} .custom-menu-item:hover {
                background-color: ${lightenColor(customization.cor_primaria, 0.1)} !important;
            }
            
            .${className} .custom-menu-item.active {
                background-color: ${customization.cor_primaria} !important;
                color: white !important;
            }
            
            /* ===== ESTILOS ESPECÍFICOS PARA O MENU VERTICAL ADMIN ===== */
            .${className} .main-nav .navbar-nav .nav-item .nav-link {
                color: ${customization.cor_texto_menu || '#495057'} !important;
                box-shadow: none !important;
                border: none !important;
            }
            
            .${className} .main-nav .navbar-nav .nav-item .nav-link:hover,
            .${className} .main-nav .navbar-nav .nav-item .nav-link:focus {
                background-color: ${customization.cor_hover_menu || '#e9ecef'} !important;
                color: ${customization.cor_texto_menu || '#495057'} !important;
                box-shadow: none !important;
                border: none !important;
            }
            
            .${className} .main-nav .navbar-nav .nav-item .nav-link.active {
                background-color: ${customization.cor_primaria} !important;
                color: white !important;
                box-shadow: none !important;
                border: none !important;
            }
            
            /* ===== MENU TITLE ===== */
            .${className} .main-nav .menu-title {
                color: ${customization.cor_texto_menu || '#6c757d'} !important;
            }
            
            /* ===== REMOVER TODAS AS SOMBRAS DOS ELEMENTOS DO MENU ===== */
            .${className} .main-nav * {
                box-shadow: none !important;
                text-shadow: none !important;
                -webkit-box-shadow: none !important;
                -moz-box-shadow: none !important;
            }
            
            .${className} .btn,
            .${className} .btn:hover,
            .${className} .btn:focus,
            .${className} .btn:active,
            .${className} .btn.active {
                box-shadow: none !important;
                -webkit-box-shadow: none !important;
                -moz-box-shadow: none !important;
            }
        `;
        
        style.textContent = css;
        document.head.appendChild(style);
    };

    const clearCustomTheme = () => {
        // Remover classe tenant do body
        document.body.className = document.body.className.replace(/tenant-\\w+/g, '');
        
        // Remover estilos personalizados
        const tenantStyles = document.querySelectorAll('[id^="tenant-styles-"]');
        tenantStyles.forEach(style => style.remove());
        
        // Limpar cache do sessionStorage e localStorage
        sessionStorage.removeItem('tenant-customization');
        localStorage.removeItem('tenant-customization');
        
        // Limpar variáveis CSS customizadas
        const root = document.documentElement;
        root.style.removeProperty('--bs-primary');
        root.style.removeProperty('--bs-secondary');
        
        setTenantClass('');
        console.log('🎨 Tema personalizado removido e cache limpo');
    };

    // Converter hex para RGB para variáveis CSS que precisam de RGB
    const hexToRgb = (hex) => {
        if (!hex) return '13, 110, 253'; // Fallback se hex for NULL
        
        // Validar formato hexadecimal
        const validHex = /^#?[0-9A-Fa-f]{6}$/;
        if (!validHex.test(hex)) {
            console.warn(`Cor inválida: ${hex}`);
            return '13, 110, 253';
        }
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            return `${r}, ${g}, ${b}`;
        }
        return '13, 110, 253'; // Fallback para primary padrão do Bootstrap
    };

    // Converter hex para RGBA
    const hexToRgba = (hex, alpha = 1) => {
        if (!hex) return `rgba(13, 110, 253, ${alpha})`; // Fallback se hex for NULL
        
        // Validar formato hexadecimal
        const validHex = /^#?[0-9A-Fa-f]{6}$/;
        if (!validHex.test(hex)) {
            console.warn(`Cor inválida: ${hex}`);
            return `rgba(13, 110, 253, ${alpha})`;
        }
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return `rgba(13, 110, 253, ${alpha})`; // Fallback
    };

    // Escurecer cor
    const darkenColor = (hex, amount = 0.1) => {
        if (!hex) return '#0956a8'; // Fallback para azul escuro se hex for NULL
        
        // Validar formato hexadecimal
        const validHex = /^#?[0-9A-Fa-f]{6}$/;
        if (!validHex.test(hex)) {
            console.warn(`Cor inválida para escurecer: ${hex}`);
            return '#0956a8';
        }
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            let r = parseInt(result[1], 16);
            let g = parseInt(result[2], 16);
            let b = parseInt(result[3], 16);
            
            r = Math.max(0, Math.floor(r * (1 - amount)));
            g = Math.max(0, Math.floor(g * (1 - amount)));
            b = Math.max(0, Math.floor(b * (1 - amount)));
            
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return hex || '#0956a8';
    };

    // Clarear cor
    const lightenColor = (hex, amount = 0.1) => {
        if (!hex) return '#e7f1ff'; // Fallback para azul claro se hex for NULL
        
        // Validar formato hexadecimal
        const validHex = /^#?[0-9A-Fa-f]{6}$/;
        if (!validHex.test(hex)) {
            console.warn(`Cor inválida para clarear: ${hex}`);
            return '#e7f1ff';
        }
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            let r = parseInt(result[1], 16);
            let g = parseInt(result[2], 16);
            let b = parseInt(result[3], 16);
            
            r = Math.min(255, Math.floor(r + (255 - r) * amount));
            g = Math.min(255, Math.floor(g + (255 - g) * amount));
            b = Math.min(255, Math.floor(b + (255 - b) * amount));
            
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return hex || '#e7f1ff';
    };

    return <>{children}</>;
}