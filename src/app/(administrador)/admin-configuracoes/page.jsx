'use client';

import { useState, useEffect } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { CardTitle, Row, Col, Card, Form, Button, Alert, Nav, Tab } from 'react-bootstrap';
import { useSession } from 'next-auth/react';
import { FaUser, FaPalette, FaUpload, FaEye, FaBars, FaCloudUploadAlt, FaUndo } from 'react-icons/fa';

export default function Configuracoes() {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('perfil');
    
    // Estados para dados do perfil
    const [profileData, setProfileData] = useState({
        nome_empresa: '',
        email: '',
        subdominio: '',
        plano: ''
    });

    // Estados para customização
    const [customizationData, setCustomizationData] = useState({
        logo_url: '',
        cor_primaria: '#0d6efd',
        cor_secundaria: '#6c757d',
        cor_fundo_menu: '#f8f9fa',
        cor_texto_menu: '#495057',
        cor_hover_menu: '',
        filtro_logo: 'none'
    });

    useEffect(() => {
        if (session?.user) {
            fetchProfileData();
            fetchCustomizationData();
        }
    }, [session]);

    const fetchProfileData = async () => {
        try {
            const response = await fetch('/api/admin/perfil');
            if (response.ok) {
                const data = await response.json();
                setProfileData(data);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
        }
    };

    const fetchCustomizationData = async () => {
        try {
            const response = await fetch('/api/admin/customizacao');
            if (response.ok) {
                const data = await response.json();
                // Usar valores padrão se os dados vierem como NULL
                setCustomizationData({
                    ...data,
                    logo_url: data.logo_url || '',
                    cor_primaria: data.cor_primaria || '#0d6efd',
                    cor_secundaria: data.cor_secundaria || '#6c757d',
                    cor_fundo_menu: data.cor_fundo_menu || '#f8f9fa',
                    cor_texto_menu: data.cor_texto_menu || '#495057',
                    cor_hover_menu: data.cor_hover_menu || '',
                    filtro_logo: data.filtro_logo || 'none'
                });
            } else if (response.status === 403) {
                const errorData = await response.json();
                setCustomizationData({ 
                    customization_available: false,
                    plano_atual: errorData.plano_atual,
                    logo_url: '',
                    cor_primaria: '#0d6efd',
                    cor_secundaria: '#6c757d',
                    cor_fundo_menu: '#f8f9fa',
                    cor_texto_menu: '#495057',
                    cor_hover_menu: '',
                    filtro_logo: 'none'
                });
                setMessage({ 
                    type: 'warning', 
                    text: `Customização visual disponível apenas para plano Enterprise. Seu plano atual: ${errorData.plano_atual}` 
                });
            }
        } catch (error) {
            console.error('Erro ao carregar customização:', error);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/perfil', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            } else {
                throw new Error('Erro ao atualizar perfil');
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erro ao salvar as alterações.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCustomization = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/customizacao', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(customizationData),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Customização salva com sucesso!' });
                // Aplicar cores dinamicamente
                applyCustomColors();
            } else {
                throw new Error('Erro ao salvar customização');
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Erro ao salvar customização.' });
        } finally {
            setLoading(false);
        }
    };

    const applyCustomColors = () => {
        const root = document.documentElement;
        root.style.setProperty('--bs-primary', customizationData.cor_primaria);
        root.style.setProperty('--bs-secondary', customizationData.cor_secundaria);
    };

    const handleProfileInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomizationInputChange = (e) => {
        const { name, value } = e.target;
        setCustomizationData(prev => ({ ...prev, [name]: value }));
        
        // Preview em tempo real das cores
        if (name === 'cor_primaria' || name === 'cor_secundaria') {
            const root = document.documentElement;
            if (name === 'cor_primaria') {
                root.style.setProperty('--bs-primary', value);
            } else {
                root.style.setProperty('--bs-secondary', value);
            }
        }

        // Trigger update do CustomThemeProvider para cores do menu
        if (name === 'cor_fundo_menu' || name === 'cor_texto_menu' || name === 'cor_hover_menu' || name === 'filtro_logo') {
            // Disparar evento customizado para atualizar tema
            window.dispatchEvent(new CustomEvent('themeUpdate', { 
                detail: { ...customizationData, [name]: value }
            }));
        }

        // Trigger update para logo
        if (name === 'logo_url') {
            window.dispatchEvent(new CustomEvent('logoUpdate', { 
                detail: { logo_url: value }
            }));
        }
    };

    const handleLogoFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            setMessage({ type: 'danger', text: 'Formato não suportado. Use JPG, PNG ou SVG.' });
            e.target.value = '';
            return;
        }

        // Validar tamanho (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'danger', text: 'Arquivo muito grande. Máximo 2MB.' });
            e.target.value = '';
            return;
        }

        setLoading(true);
        setMessage({ type: 'info', text: 'Fazendo upload da logo...' });

        try {
            const formData = new FormData();
            formData.append('logo', file);

            console.log('📤 Iniciando upload da logo...');

            const response = await fetch('/api/admin/upload-logo', {
                method: 'POST',
                body: formData,
            });

            console.log('📥 Resposta do upload:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Upload bem-sucedido:', data);
                
                setCustomizationData(prev => ({ ...prev, logo_url: data.logo_url }));
                setMessage({ type: 'success', text: 'Logo enviada com sucesso!' });
                
                // Disparar evento para atualizar logo em tempo real
                window.dispatchEvent(new CustomEvent('logoUpdate', { 
                    detail: { logo_url: data.logo_url }
                }));
            } else {
                const errorText = await response.text();
                console.error('❌ Erro no upload:', response.status, errorText);
                setMessage({ type: 'danger', text: `Erro ao enviar logo: ${response.status}` });
            }
        } catch (error) {
            console.error('❌ Erro no upload:', error);
            setMessage({ type: 'danger', text: 'Erro ao enviar logo. Tente novamente.' });
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handlePaletteSelect = (palette) => {
        const newCustomization = {
            ...customizationData,
            cor_primaria: palette.primary,
            cor_secundaria: palette.secondary,
            cor_fundo_menu: palette.menu,
            cor_texto_menu: palette.text,
            cor_hover_menu: palette.primary
        };

        setCustomizationData(newCustomization);
        
        // Aplicar mudanças em tempo real
        const root = document.documentElement;
        root.style.setProperty('--bs-primary', palette.primary);
        root.style.setProperty('--bs-secondary', palette.secondary);
        
        // Disparar eventos para atualização
        window.dispatchEvent(new CustomEvent('themeUpdate', { 
            detail: newCustomization
        }));
    };

    const handleResetToDefaults = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/customizacao/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Recarregar as configurações do backend após reset
                await fetchCustomizationData();
                
                // Limpar estilos personalizados forçando reload
                const tenantStyles = document.querySelectorAll('[id^="tenant-styles-"]');
                tenantStyles.forEach(style => style.remove());
                
                // Limpar cache do sessionStorage e localStorage
                sessionStorage.removeItem('tenant-customization');
                localStorage.removeItem('tenant-customization');
                
                // Forçar reload da página para aplicar mudanças completamente
                setMessage({ type: 'success', text: 'Configurações restauradas! Recarregando...' });
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao restaurar configurações');
            }
        } catch (error) {
            console.error('Erro ao restaurar:', error);
            setMessage({ type: 'danger', text: error.message || 'Erro ao restaurar configurações.' });
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading') {
        return <div>Carregando...</div>;
    }

    return (
        <ComponentContainerCard id="configuracoes">
            {/* Cabeçalho */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle as="h4" className="mb-0">Configurações</CardTitle>
            </div>

            {message && (
                <Alert variant={message.type} className="mb-4">
                    {message.text}
                </Alert>
            )}

            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                        <Nav variant="tabs" className="px-4 pt-3">
                            <Nav.Item>
                                <Nav.Link eventKey="perfil">
                                    <FaUser className="me-2" />
                                    Perfil da Empresa
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="customizacao">
                                    <FaPalette className="me-2" />
                                    Personalização Visual
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <Tab.Content className="p-4">
                            {/* Aba Perfil */}
                            <Tab.Pane eventKey="perfil">
                                <Row>
                                    <Col lg={8}>
                                        <h5 className="mb-4">Informações da Empresa</h5>
                                        
                                        <Form onSubmit={handleSaveProfile}>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Nome da Empresa</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="nome_empresa"
                                                            value={profileData.nome_empresa}
                                                            onChange={handleProfileInputChange}
                                                            placeholder="Digite o nome da empresa"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>E-mail</Form.Label>
                                                        <Form.Control
                                                            type="email"
                                                            name="email"
                                                            value={profileData.email}
                                                            onChange={handleProfileInputChange}
                                                            placeholder="Digite o e-mail"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Subdomínio</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="subdominio"
                                                            value={profileData.subdominio}
                                                            onChange={handleProfileInputChange}
                                                            placeholder="Digite o subdomínio"
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Plano Atual</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            value={profileData.plano}
                                                            disabled
                                                            placeholder="Carregando plano..."
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <div className="d-flex justify-content-end">
                                                <Button 
                                                    type="submit" 
                                                    variant="primary"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Salvando...' : 'Salvar Perfil'}
                                                </Button>
                                            </div>
                                        </Form>
                                    </Col>
                                    
                                    <Col lg={4}>
                                        <Card className="bg-light border-0">
                                            <Card.Body>
                                                <h6 className="mb-3">Informações da Conta</h6>
                                                
                                                <div className="mb-3">
                                                    <small className="text-muted">Tipo de Conta</small>
                                                    <div className="fw-semibold">Provedor</div>
                                                </div>
                                                
                                                <div className="mb-3">
                                                    <small className="text-muted">Tenant ID</small>
                                                    <div className="fw-semibold text-break" style={{ fontSize: '0.85rem' }}>
                                                        {session?.user?.tenant_id || 'N/A'}
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-3">
                                                    <small className="text-muted">Status</small>
                                                    <div className="fw-semibold text-success">Ativo</div>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </Tab.Pane>

                            {/* Aba Customização */}
                            <Tab.Pane eventKey="customizacao">
                                <Row>
                                    <Col lg={8}>
                                        <h5 className="mb-4">Personalização Visual</h5>
                                        
                                        <Form onSubmit={handleSaveCustomization}>
                                            {/* Logo */}
                                            <Form.Group className="mb-4">
                                                <Form.Label>
                                                    <FaCloudUploadAlt className="me-2" />
                                                    Logo da Empresa
                                                </Form.Label>
                                                
                                                <Form.Control
                                                    type="file"
                                                    accept="image/png,image/jpg,image/jpeg,image/svg+xml"
                                                    onChange={handleLogoFileUpload}
                                                    disabled={customizationData.customization_available === false || loading}
                                                    className="mb-3"
                                                />

                                                {/* Filtro da Logo */}
                                                <div className="mb-3">
                                                    <Form.Label className="small">Estilo da Logo:</Form.Label>
                                                    <Form.Select
                                                        name="filtro_logo"
                                                        value={customizationData.filtro_logo || 'none'}
                                                        onChange={handleCustomizationInputChange}
                                                        disabled={customizationData.customization_available === false}
                                                        size="sm"
                                                    >
                                                        <option value="none">🎨 Original (colorida)</option>
                                                        <option value="brightness(0) invert(1)">⚪ Branca</option>
                                                        <option value="brightness(0)">⚫ Preta</option>
                                                        <option value="grayscale(1)">🔘 Cinza</option>
                                                        <option value="sepia(1)">🟤 Sépia</option>
                                                        <option value="hue-rotate(180deg)">🔄 Cores Invertidas</option>
                                                        <option value="brightness(1.3) contrast(1.2)">✨ Mais Brilhante</option>
                                                        <option value="brightness(0.7) contrast(0.8)">🌙 Mais Escura</option>
                                                    </Form.Select>
                                                </div>
                                                
                                                <Form.Text className="text-muted">
                                                    {customizationData.customization_available === false 
                                                        ? 'Funcionalidade disponível apenas para plano Enterprise'
                                                        : 'Requisitos: PNG, JPG ou SVG • Recomendado: 200x60px ou proporção 3:1 • Máximo: 2MB'
                                                    }
                                                </Form.Text>
                                            </Form.Group>

                                            {/* Paletas Predefinidas */}
                                            <div className="mb-4">
                                                <Form.Label className="fw-bold">🎨 Paletas Predefinidas</Form.Label>
                                                <div className="d-flex flex-wrap gap-2 mt-2">
                                                    {[
                                                        { name: 'Azul Clássico', primary: '#0d6efd', secondary: '#6c757d', menu: '#f8f9fa', text: '#495057' },
                                                        { name: 'Verde Natureza', primary: '#198754', secondary: '#20c997', menu: '#e8f5e8', text: '#0f5132' },
                                                        { name: 'Roxo Moderno', primary: '#6f42c1', secondary: '#e83e8c', menu: '#f8f4ff', text: '#492874' },
                                                        { name: 'Laranja Energia', primary: '#fd7e14', secondary: '#ffc107', menu: '#fff8e1', text: '#cc5500' },
                                                        { name: 'Rosa Suave', primary: '#d63384', secondary: '#f8d7da', menu: '#fdf2f8', text: '#a02142' },
                                                        { name: 'Tema Dark', primary: '#0f7b0f', secondary: '#40e0d0', menu: '#1a1a1a', text: '#e9ecef' },
                                                        { name: 'Azul Escuro', primary: '#0c2556', secondary: '#495057', menu: '#f1f3f4', text: '#2c3e50' }
                                                    ].map((palette, index) => (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            className="btn btn-outline-secondary p-2 d-flex align-items-center gap-2"
                                                            onClick={() => handlePaletteSelect(palette)}
                                                            disabled={customizationData.customization_available === false}
                                                            title={palette.name}
                                                        >
                                                            <div className="d-flex">
                                                                <div style={{ width: '12px', height: '12px', backgroundColor: palette.primary, borderRadius: '2px' }}></div>
                                                                <div style={{ width: '12px', height: '12px', backgroundColor: palette.secondary, borderRadius: '2px', marginLeft: '2px' }}></div>
                                                                <div style={{ width: '12px', height: '12px', backgroundColor: palette.menu, borderRadius: '2px', marginLeft: '2px', border: '1px solid #dee2e6' }}></div>
                                                            </div>
                                                            <small className="text-nowrap">{palette.name}</small>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Cores Gerais */}
                                            <h6 className="mb-3">🎯 Cores Gerais</h6>
                                            <Row className="mb-4">
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Cor Primária</Form.Label>
                                                        <div className="d-flex align-items-center">
                                                            <Form.Control
                                                                type="color"
                                                                name="cor_primaria"
                                                                value={customizationData.cor_primaria || '#0d6efd'}
                                                                onChange={handleCustomizationInputChange}
                                                                className="me-3"
                                                                style={{ width: '60px', height: '40px' }}
                                                                disabled={customizationData.customization_available === false}
                                                            />
                                                            <Form.Control
                                                                type="text"
                                                                name="cor_primaria"
                                                                value={customizationData.cor_primaria || '#0d6efd'}
                                                                onChange={handleCustomizationInputChange}
                                                                placeholder="#0d6efd"
                                                                disabled={customizationData.customization_available === false}
                                                            />
                                                        </div>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Cor Secundária</Form.Label>
                                                        <div className="d-flex align-items-center">
                                                            <Form.Control
                                                                type="color"
                                                                name="cor_secundaria"
                                                                value={customizationData.cor_secundaria || '#6c757d'}
                                                                onChange={handleCustomizationInputChange}
                                                                className="me-3"
                                                                style={{ width: '60px', height: '40px' }}
                                                                disabled={customizationData.customization_available === false}
                                                            />
                                                            <Form.Control
                                                                type="text"
                                                                name="cor_secundaria"
                                                                value={customizationData.cor_secundaria || '#6c757d'}
                                                                onChange={handleCustomizationInputChange}
                                                                placeholder="#6c757d"
                                                                disabled={customizationData.customization_available === false}
                                                            />
                                                        </div>
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            {/* Cores do Menu */}
                                            <h6 className="mb-3">📋 Menu Lateral</h6>
                                            <Row>
                                                <Col md={4}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Cor de Fundo</Form.Label>
                                                        <div className="d-flex align-items-center">
                                                            <Form.Control
                                                                type="color"
                                                                name="cor_fundo_menu"
                                                                value={customizationData.cor_fundo_menu || '#f8f9fa'}
                                                                onChange={handleCustomizationInputChange}
                                                                className="me-3"
                                                                style={{ width: '50px', height: '35px' }}
                                                                disabled={customizationData.customization_available === false}
                                                            />
                                                            <Form.Control
                                                                type="text"
                                                                name="cor_fundo_menu"
                                                                value={customizationData.cor_fundo_menu || '#f8f9fa'}
                                                                onChange={handleCustomizationInputChange}
                                                                placeholder="#f8f9fa"
                                                                disabled={customizationData.customization_available === false}
                                                                size="sm"
                                                            />
                                                        </div>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Cor do Texto</Form.Label>
                                                        <div className="d-flex align-items-center">
                                                            <Form.Control
                                                                type="color"
                                                                name="cor_texto_menu"
                                                                value={customizationData.cor_texto_menu || '#495057'}
                                                                onChange={handleCustomizationInputChange}
                                                                className="me-3"
                                                                style={{ width: '50px', height: '35px' }}
                                                                disabled={customizationData.customization_available === false}
                                                            />
                                                            <Form.Control
                                                                type="text"
                                                                name="cor_texto_menu"
                                                                value={customizationData.cor_texto_menu || '#495057'}
                                                                onChange={handleCustomizationInputChange}
                                                                placeholder="#495057"
                                                                disabled={customizationData.customization_available === false}
                                                                size="sm"
                                                            />
                                                        </div>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={4}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Cor do Hover</Form.Label>
                                                        <div className="d-flex align-items-center">
                                                            <Form.Control
                                                                type="color"
                                                                name="cor_hover_menu"
                                                                value={customizationData.cor_hover_menu || customizationData.cor_primaria}
                                                                onChange={handleCustomizationInputChange}
                                                                className="me-3"
                                                                style={{ width: '50px', height: '35px' }}
                                                                disabled={customizationData.customization_available === false}
                                                            />
                                                            <Form.Control
                                                                type="text"
                                                                name="cor_hover_menu"
                                                                value={customizationData.cor_hover_menu || ''}
                                                                onChange={handleCustomizationInputChange}
                                                                placeholder="Auto"
                                                                disabled={customizationData.customization_available === false}
                                                                size="sm"
                                                            />
                                                        </div>
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <div className="d-flex justify-content-between">
                                                <Button 
                                                    type="button"
                                                    variant="outline-secondary"
                                                    onClick={handleResetToDefaults}
                                                    disabled={loading || customizationData.customization_available === false}
                                                >
                                                    <FaUndo className="me-2" />
                                                    Restaurar Padrão
                                                </Button>
                                                <Button 
                                                    type="submit" 
                                                    variant="primary"
                                                    disabled={loading || customizationData.customization_available === false}
                                                >
                                                    {loading ? 'Salvando...' : 
                                                     customizationData.customization_available === false ? 'Upgrade para Enterprise' : 
                                                     'Salvar Customização'}
                                                </Button>
                                            </div>
                                        </Form>
                                    </Col>
                                    
                                    <Col lg={4}>
                                        <Card className="bg-light border-0">
                                            <Card.Body>
                                                <h6 className="mb-3">
                                                    <FaPalette className="me-2" />
                                                    Dicas
                                                </h6>
                                                
                                                <Alert variant="info" className="small mb-3">
                                                    <strong>💡 Requisitos da Logo:</strong><br/>
                                                    • Formatos: PNG, JPG, SVG<br/>
                                                    • Tamanho: máximo 2MB<br/>
                                                    • Proporção ideal: 3:1 (ex: 300x100px)
                                                </Alert>

                                                <Alert variant="success" className="small mb-3">
                                                    <strong>🎨 Paletas:</strong><br/>
                                                    Clique em qualquer paleta para aplicar todas as cores automaticamente!
                                                </Alert>

                                                <Alert variant="warning" className="small">
                                                    <strong>⚡ Tempo Real:</strong><br/>
                                                    Todas as mudanças são aplicadas instantaneamente no menu lateral.
                                                </Alert>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </Tab.Pane>
                        </Tab.Content>
                    </Tab.Container>
                </Card.Body>
            </Card>
        </ComponentContainerCard>
    );
}