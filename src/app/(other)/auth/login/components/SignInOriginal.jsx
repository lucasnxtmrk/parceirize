'use client';

import { useState, useEffect } from 'react';
import logoDark from '@/assets/images/logo-dark.png';
import LogoLight from '@/assets/images/logo-light.png';
import TextFormInput from '@/components/from/TextFormInput';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Card, CardBody, Col, Container, Row, Alert } from 'react-bootstrap';
import useSignIn from './useSignIn';

const SignIn = () => {
  const { loading, login, control } = useSignIn();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');

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
                Bem-vindo de volta
              </h1>
              <p className="text-white mb-0" style={{
                opacity: 0.8,
                fontSize: '1rem',
                fontWeight: '400'
              }}>
                Entre com suas credenciais para continuar
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
                
                {/* Info Alert */}
                <Alert variant="info" className="mb-4 border-0" style={{
                  background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                  borderRadius: '12px',
                  fontSize: '0.875rem'
                }}>
                  <IconifyIcon icon="heroicons:information-circle" className="me-2" />
                  <strong>Contas de Teste:</strong> SuperAdmin (admin@nextmark.com.br) | Provedor (teste@multitenant.com) - Senha: 123456
                </Alert>

                <form className="authentication-form" onSubmit={login}>
                  
                  {/* Campo E-mail */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold mb-3" style={{
                      color: '#374151', 
                      fontSize: '0.875rem',
                      letterSpacing: '0.025em'
                    }}>
                      Endereço de E-mail
                    </label>
                    <div className="position-relative">
                      <div className="position-absolute top-50 start-0 translate-middle-y ps-4" 
                           style={{zIndex: 10}}>
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
                        control={control} 
                        name="email" 
                        placeholder="Digite seu e-mail"
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
                        onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <div className="position-relative">
                      <div className="position-absolute top-50 start-0 translate-middle-y ps-4" 
                           style={{zIndex: 10}}>
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
                        control={control} 
                        name="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField('')}
                        className="form-control-lg"
                        style={{
                          background: '#ffffff',
                          border: `2px solid ${focusedField === 'password' ? '#DE488C' : '#E5E7EB'}`,
                          borderRadius: '16px',
                          padding: '1rem 3.75rem 1rem 3.25rem',
                          fontSize: '0.9375rem',
                          color: '#1F2937',
                          transition: 'all 0.3s ease',
                          boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(222, 72, 140, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
                        }}
                      />
                      <Button 
                        type="button"
                        variant="link" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="position-absolute top-50 end-0 translate-middle-y me-4 p-0 border-0"
                        style={{
                          color: showPassword ? '#DE488C' : '#9CA3AF',
                          background: 'transparent',
                          zIndex: 10,
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s ease'
                        }}
                      >
                        <IconifyIcon 
                          icon={showPassword ? "heroicons:eye-slash" : "heroicons:eye"} 
                          width={20} 
                        />
                      </Button>
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
                      disabled={loading} 
                      className="btn btn-lg fw-semibold position-relative overflow-hidden" 
                      type="submit"
                      style={{
                        background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #DE488C 0%, #1B1236 100%)',
                        border: 'none',
                        borderRadius: '16px',
                        color: '#ffffff',
                        padding: '1rem 2rem',
                        fontSize: '0.9375rem',
                        letterSpacing: '0.025em',
                        boxShadow: loading ? 'none' : '0 8px 25px rgba(222, 72, 140, 0.3)',
                        transition: 'all 0.3s ease',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 12px 35px rgba(222, 72, 140, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 8px 25px rgba(222, 72, 140, 0.3)';
                        }
                      }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Entrando...
                        </>
                      ) : (
                        <>
                          <IconifyIcon icon="heroicons:arrow-right-on-rectangle" width={20} className="me-2" />
                          Entrar na Plataforma
                        </>
                      )}
                    </button>
                  </div>
                </form>
                
                {/* Links para outras áreas */}
                <div className="text-center">
                  <p className="mb-3" style={{
                    color: '#6B7280', 
                    fontSize: '0.875rem'
                  }}>
                    Não tem uma conta? 
                    <Link 
                      href="/auth/sign-up" 
                      className="text-decoration-none fw-semibold ms-1" 
                      style={{
                        color: '#DE488C',
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      Solicite acesso
                    </Link>
                  </p>
                  
                  {/* Quick Access Links */}
                  <div className="d-flex justify-content-center flex-wrap gap-3 pt-3" style={{
                    borderTop: '1px solid #E5E7EB'
                  }}>
                    <Link 
                      href="/auth/login-cliente" 
                      className="text-decoration-none d-flex align-items-center px-3 py-2 rounded-pill"
                      style={{
                        color: '#6B7280',
                        fontSize: '0.8125rem',
                        background: 'rgba(107, 114, 128, 0.05)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(222, 72, 140, 0.1)';
                        e.target.style.color = '#DE488C';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(107, 114, 128, 0.05)';
                        e.target.style.color = '#6B7280';
                      }}
                    >
                      <IconifyIcon icon="heroicons:user" width={16} className="me-1" />
                      Área Cliente
                    </Link>
                    
                    <Link 
                      href="/auth/login-parceiro" 
                      className="text-decoration-none d-flex align-items-center px-3 py-2 rounded-pill"
                      style={{
                        color: '#6B7280',
                        fontSize: '0.8125rem',
                        background: 'rgba(107, 114, 128, 0.05)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(222, 72, 140, 0.1)';
                        e.target.style.color = '#DE488C';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(107, 114, 128, 0.05)';
                        e.target.style.color = '#6B7280';
                      }}
                    >
                      <IconifyIcon icon="heroicons:building-storefront" width={16} className="me-1" />
                      Área Parceiro
                    </Link>
                  </div>
                </div>
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