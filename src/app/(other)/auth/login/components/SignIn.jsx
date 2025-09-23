'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LogoLight from '@/assets/images/logo-light.png';
import TextFormInput from '@/components/from/TextFormInput';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Card, CardBody, Col, Container, Row, Alert, Nav } from 'react-bootstrap';
import { Controller } from 'react-hook-form';
import useSignIn from './useSignIn';

const SignIn = () => {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('cliente');
  const [focusedField, setFocusedField] = useState('');

  // Usar useEffect para evitar hydration mismatch
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['cliente', 'parceiro'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    document.body.style.background = 'linear-gradient(135deg, #1B1236 0%, #2D1B69 50%, #1B1236 100%)';
    document.body.style.minHeight = '100vh';
    document.body.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    return () => {
      document.body.style.background = '';
      document.body.style.minHeight = '';
      document.body.style.fontFamily = '';
    };
  }, []);

  const {
    // Cliente
    loadingCliente,
    step,
    clienteData,
    documentoForm,
    passwordForm,
    checkDocumento,
    loginCliente,
    goBack,
    formatDocumento,
    detectarTipoDocumento,
    // Parceiro
    loadingParceiro,
    parceiroForm,
    loginParceiro
  } = useSignIn();

  const renderClienteTab = () => {
    if (step === 1) {
      // Primeira etapa: CPF/CNPJ
      return (
        <form onSubmit={checkDocumento}>
          <div className="mb-4">
            <label className="form-label fw-semibold mb-3" style={{
              color: '#374151',
              fontSize: '0.875rem',
              letterSpacing: '0.025em'
            }}>
              CPF ou CNPJ
            </label>
            <div className="position-relative">
              <div className="position-absolute top-50 start-0 translate-middle-y ps-4" style={{zIndex: 10}}>
                <IconifyIcon
                  icon="heroicons:identification"
                  width={20}
                  style={{
                    color: focusedField === 'documento' ? '#DE488C' : '#9CA3AF',
                    transition: 'color 0.2s ease'
                  }}
                />
              </div>
              <Controller
                name="documento"
                control={documentoForm.control}
                render={({ field: { onChange, value, ...field } }) => {
                  const tipoDoc = detectarTipoDocumento(value);
                  const placeholder = tipoDoc === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00';

                  return (
                    <input
                      {...field}
                      value={formatDocumento(value)}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      maxLength={18}
                      onFocus={() => setFocusedField('documento')}
                      onBlur={() => setFocusedField('')}
                      className="form-control form-control-lg"
                      style={{
                        background: '#ffffff',
                        border: `2px solid ${focusedField === 'documento' ? '#DE488C' : '#E5E7EB'}`,
                        borderRadius: '16px',
                        padding: '1rem 1rem 1rem 3.25rem',
                        fontSize: '0.9375rem',
                        color: '#1F2937',
                        transition: 'all 0.3s ease',
                        boxShadow: focusedField === 'documento' ? '0 0 0 3px rgba(222, 72, 140, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
                      }}
                    />
                  );
                }}
              />
            </div>
            {/* Indicador de tipo */}
            <div className="mt-2">
              <Controller
                name="documento"
                control={documentoForm.control}
                render={({ field: { value } }) => {
                  const documento = value.replace(/\D/g, '');
                  if (documento.length >= 3) {
                    const tipo = detectarTipoDocumento(value);
                    return (
                      <small className="text-muted d-flex align-items-center">
                        <IconifyIcon
                          icon={tipo === 'CPF' ? 'heroicons:user' : 'heroicons:building-office'}
                          width={14}
                          className="me-1"
                        />
                        Documento tipo: {tipo}
                      </small>
                    );
                  }
                  return null;
                }}
              />
            </div>
          </div>

          <div className="d-grid mb-4">
            <button
              disabled={loadingCliente}
              className="btn btn-lg fw-semibold position-relative overflow-hidden"
              type="submit"
              style={{
                background: loadingCliente ? '#9CA3AF' : 'linear-gradient(135deg, #DE488C 0%, #1B1236 100%)',
                border: 'none',
                borderRadius: '16px',
                color: '#ffffff',
                padding: '1rem 2rem',
                fontSize: '0.9375rem',
                letterSpacing: '0.025em',
                boxShadow: loadingCliente ? 'none' : '0 8px 25px rgba(222, 72, 140, 0.3)',
                transition: 'all 0.3s ease',
                cursor: loadingCliente ? 'not-allowed' : 'pointer'
              }}
            >
              {loadingCliente ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Verificando...
                </>
              ) : (
                <>
                  <IconifyIcon icon="heroicons:arrow-right" width={20} className="me-2" />
                  Continuar
                </>
              )}
            </button>
          </div>
        </form>
      );
    } else {
      // Segunda etapa: Senha
      return (
        <form onSubmit={loginCliente}>
          {/* Dados do cliente */}
          <div className="mb-4 p-3 rounded-3" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
            <div className="d-flex align-items-center">
              <IconifyIcon icon="heroicons:check-circle" className="text-success me-2" width={20} />
              <div>
                <div className="fw-semibold">{clienteData?.nome} {clienteData?.sobrenome}</div>
                <small className="text-muted">{detectarTipoDocumento(clienteData?.cpf_cnpj)} verificado com sucesso</small>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold mb-3" style={{
              color: '#374151',
              fontSize: '0.875rem',
              letterSpacing: '0.025em'
            }}>
              Senha
            </label>
            <div className="position-relative">
              <div className="position-absolute top-50 start-0 translate-middle-y ps-4" style={{zIndex: 10}}>
                <IconifyIcon
                  icon="heroicons:lock-closed"
                  width={20}
                  style={{
                    color: focusedField === 'password' ? '#DE488C' : '#9CA3AF',
                    transition: 'color 0.2s ease'
                  }}
                />
              </div>
              <TextFormInput
                control={passwordForm.control}
                name="password"
                type="password"
                placeholder="Digite sua senha"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                className="form-control-lg"
                style={{
                  background: '#ffffff',
                  border: `2px solid ${focusedField === 'password' ? '#DE488C' : '#E5E7EB'}`,
                  borderRadius: '16px',
                  padding: '1rem 1rem 1rem 3.25rem',
                  fontSize: '0.9375rem',
                  color: '#1F2937',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(222, 72, 140, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>
          </div>

          <div className="d-grid gap-2 mb-4">
            <button
              disabled={loadingCliente}
              className="btn btn-lg fw-semibold position-relative overflow-hidden"
              type="submit"
              style={{
                background: loadingCliente ? '#9CA3AF' : 'linear-gradient(135deg, #DE488C 0%, #1B1236 100%)',
                border: 'none',
                borderRadius: '16px',
                color: '#ffffff',
                padding: '1rem 2rem',
                fontSize: '0.9375rem',
                letterSpacing: '0.025em',
                boxShadow: loadingCliente ? 'none' : '0 8px 25px rgba(222, 72, 140, 0.3)',
                transition: 'all 0.3s ease',
                cursor: loadingCliente ? 'not-allowed' : 'pointer'
              }}
            >
              {loadingCliente ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Entrando...
                </>
              ) : (
                <>
                  <IconifyIcon icon="heroicons:arrow-right-on-rectangle" width={20} className="me-2" />
                  Entrar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={goBack}
              className="btn btn-outline-secondary btn-lg"
              style={{
                borderRadius: '16px',
                padding: '1rem 2rem',
                fontSize: '0.9375rem'
              }}
            >
              <IconifyIcon icon="heroicons:arrow-left" width={20} className="me-2" />
              Voltar
            </button>
          </div>
        </form>
      );
    }
  };

  const renderParceiroTab = () => {
    return (
      <form onSubmit={loginParceiro}>
        {/* Campo E-mail */}
        <div className="mb-4">
          <label className="form-label fw-semibold mb-3" style={{
            color: '#374151',
            fontSize: '0.875rem',
            letterSpacing: '0.025em'
          }}>
            E-mail
          </label>
          <div className="position-relative">
            <div className="position-absolute top-50 start-0 translate-middle-y ps-4" style={{zIndex: 10}}>
              <IconifyIcon
                icon="heroicons:envelope"
                width={20}
                style={{
                  color: focusedField === 'email' ? '#DE488C' : '#9CA3AF',
                  transition: 'color 0.2s ease'
                }}
              />
            </div>
            <TextFormInput
              control={parceiroForm.control}
              name="email"
              placeholder="seu.email@empresa.com"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              className="form-control-lg"
              style={{
                background: '#ffffff',
                border: `2px solid ${focusedField === 'email' ? '#DE488C' : '#E5E7EB'}`,
                borderRadius: '16px',
                padding: '1rem 1rem 1rem 3.25rem',
                fontSize: '0.9375rem',
                color: '#1F2937',
                transition: 'all 0.3s ease',
                boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(222, 72, 140, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
            />
          </div>
        </div>

        {/* Campo Senha */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <label className="form-label fw-semibold mb-0" style={{
              color: '#374151',
              fontSize: '0.875rem',
              letterSpacing: '0.025em'
            }}>
              Senha
            </label>
            <Link
              href="/auth/reset-password"
              className="text-decoration-none fw-medium"
              style={{
                color: '#DE488C',
                fontSize: '0.8125rem',
                transition: 'opacity 0.2s ease'
              }}
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="position-relative">
            <div className="position-absolute top-50 start-0 translate-middle-y ps-4" style={{zIndex: 10}}>
              <IconifyIcon
                icon="heroicons:lock-closed"
                width={20}
                style={{
                  color: focusedField === 'password' ? '#DE488C' : '#9CA3AF',
                  transition: 'color 0.2s ease'
                }}
              />
            </div>
            <TextFormInput
              control={parceiroForm.control}
              name="password"
              type="password"
              placeholder="Digite sua senha"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
              className="form-control-lg"
              style={{
                background: '#ffffff',
                border: `2px solid ${focusedField === 'password' ? '#DE488C' : '#E5E7EB'}`,
                borderRadius: '16px',
                padding: '1rem 1rem 1rem 3.25rem',
                fontSize: '0.9375rem',
                color: '#1F2937',
                transition: 'all 0.3s ease',
                boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(222, 72, 140, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
            />
          </div>
        </div>

        {/* Checkbox Lembrar-me */}
        <div className="mb-5">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="remember-me"
              style={{
                width: '18px',
                height: '18px',
                background: '#ffffff',
                borderColor: '#D1D5DB',
                borderRadius: '6px'
              }}
            />
            <label
              className="form-check-label ms-2 fw-medium"
              htmlFor="remember-me"
              style={{
                color: '#6B7280',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Manter-me conectado
            </label>
          </div>
        </div>

        {/* Botão de Login */}
        <div className="d-grid mb-4">
          <button
            disabled={loadingParceiro}
            className="btn btn-lg fw-semibold position-relative overflow-hidden"
            type="submit"
            style={{
              background: loadingParceiro ? '#9CA3AF' : 'linear-gradient(135deg, #DE488C 0%, #1B1236 100%)',
              border: 'none',
              borderRadius: '16px',
              color: '#ffffff',
              padding: '1rem 2rem',
              fontSize: '0.9375rem',
              letterSpacing: '0.025em',
              boxShadow: loadingParceiro ? 'none' : '0 8px 25px rgba(222, 72, 140, 0.3)',
              transition: 'all 0.3s ease',
              cursor: loadingParceiro ? 'not-allowed' : 'pointer'
            }}
          >
            {loadingParceiro ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Entrando...
              </>
            ) : (
              <>
                <IconifyIcon icon="heroicons:arrow-right-on-rectangle" width={20} className="me-2" />
                Acessar Painel
              </>
            )}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="login-container min-vh-100 position-relative overflow-hidden">
      {/* Background Pattern */}
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{opacity: 0.1}}>
        <div className="position-absolute" style={{
          top: '10%',
          right: '15%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(222, 72, 140, 0.4) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }}></div>
        <div className="position-absolute" style={{
          bottom: '20%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }}></div>
        <div className="position-absolute" style={{
          top: '60%',
          right: '5%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }}></div>
      </div>

      <Container className="position-relative h-100">
        <Row className="justify-content-center align-items-center min-vh-100 py-5">
          <Col xs={12} sm={10} md={8} lg={5} xl={4}>

            {/* Header */}
            <div className="text-center mb-4">
              <div className="d-inline-block mb-4 position-relative">
                <div className="position-absolute top-50 start-50 translate-middle"
                     style={{
                       width: '80px',
                       height: '80px',
                       background: 'rgba(255, 255, 255, 0.1)',
                       borderRadius: '50%',
                       filter: 'blur(20px)',
                       zIndex: 0
                     }}>
                </div>
                <Image
                  src={LogoLight}
                  height={60}
                  alt="Parceirize Logo"
                  className="position-relative"
                  style={{zIndex: 1}}
                />
              </div>
              <h1 className="text-white fw-bold mb-2" style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
                letterSpacing: '-0.02em',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}>
                Parceirize
              </h1>
              <p className="text-white mb-0" style={{
                opacity: 0.8,
                fontSize: '1rem',
                fontWeight: '400'
              }}>
                Acesse sua conta
              </p>
            </div>

            {/* Login Card */}
            <Card className="border-0 shadow-2xl" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}>
              <CardBody className="p-4 p-md-5">

                {/* Tabs */}
                <Nav variant="tabs" className="mb-4" style={{ border: 'none' }}>
                  <Nav.Item className="flex-fill">
                    <Nav.Link
                      active={activeTab === 'cliente'}
                      onClick={() => setActiveTab('cliente')}
                      className="text-center border-0 py-3"
                      style={{
                        background: activeTab === 'cliente' ? 'linear-gradient(135deg, #DE488C 0%, #1B1236 100%)' : 'transparent',
                        color: activeTab === 'cliente' ? '#ffffff !important' : '#6B7280',
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}
                    >
                      <IconifyIcon
                        icon="heroicons:user"
                        width={16}
                        className="me-2"
                        style={{ color: activeTab === 'cliente' ? '#ffffff' : '#6B7280' }}
                      />
                      <span style={{ color: activeTab === 'cliente' ? '#ffffff' : '#6B7280' }}>
                        Cliente
                      </span>
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item className="flex-fill ms-2">
                    <Nav.Link
                      active={activeTab === 'parceiro'}
                      onClick={() => setActiveTab('parceiro')}
                      className="text-center border-0 py-3"
                      style={{
                        background: activeTab === 'parceiro' ? 'linear-gradient(135deg, #DE488C 0%, #1B1236 100%)' : 'transparent',
                        color: activeTab === 'parceiro' ? '#ffffff !important' : '#6B7280',
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}
                    >
                      <IconifyIcon
                        icon="heroicons:building-office"
                        width={16}
                        className="me-2"
                        style={{ color: activeTab === 'parceiro' ? '#ffffff' : '#6B7280' }}
                      />
                      <span style={{ color: activeTab === 'parceiro' ? '#ffffff' : '#6B7280' }}>
                        Parceiro
                      </span>
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                {/* Info Alert */}
                <Alert variant="info" className="mb-4 border-0" style={{
                  background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                  borderRadius: '12px',
                  fontSize: '0.875rem'
                }}>
                  <IconifyIcon
                    icon={activeTab === 'cliente' ? 'heroicons:identification' : 'heroicons:building-office'}
                    className="me-2"
                  />
                  <strong>{activeTab === 'cliente' ? 'Cliente:' : 'Parceiro:'}</strong> {' '}
                  {activeTab === 'cliente' ? 'Entre com seu CPF ou CNPJ' : 'Entre com seu e-mail corporativo e senha'}
                </Alert>

                {/* Content baseado na tab ativa */}
                {activeTab === 'cliente' ? renderClienteTab() : renderParceiroTab()}

              </CardBody>
            </Card>


            {/* Footer */}
            <div className="text-center mt-4">
              <p className="mb-0" style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.8125rem'
              }}>
                © 2024 Parceirize. Desenvolvido pela NEXTMARK.
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SignIn;