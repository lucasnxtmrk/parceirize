'use client';

import { useState, useEffect } from 'react';
import logoDark from '@/assets/images/logo-dark.png';
import LogoLight from '@/assets/images/logo-light.png';
import TextFormInput from '@/components/from/TextFormInput';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Card, CardBody, Col, Container, Row, InputGroup, FormControl } from 'react-bootstrap';
import useSignIn from './useSignIn';

const SignIn = () => {
  useEffect(() => {
    document.body.style.backgroundColor = 'var(--gray-50, #f8fafc)';
    document.body.style.fontFamily = 'Inter, system-ui, sans-serif';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.fontFamily = '';
    };
  }, []);

  const { loading, login, control } = useSignIn();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-container min-vh-100 position-relative overflow-hidden">
      {/* Background decorativo */}
      <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10">
        <div className="position-absolute" style={{
          top: '-5%',
          right: '-5%',
          width: '300px',
          height: '300px',
          background: 'rgba(222, 72, 140, 0.3)',
          borderRadius: '50%',
          filter: 'blur(60px)'
        }}></div>
        <div className="position-absolute" style={{
          bottom: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(80px)'
        }}></div>
      </div>
      
      <Container className="position-relative">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col xs={12} sm={10} md={8} lg={5} xl={4}>
            {/* Header elegante */}
            <div className="text-center mb-5">
              <div className="d-inline-block mb-4">
                <Image src={LogoLight} height={50} alt="logo" className="login-logo img-fluid" />
              </div>
              <h1 className="login-title mb-3 fw-bold" style={{fontSize: '2rem'}}>Bem-vindo de volta</h1>
              <p className="login-subtitle mb-0" style={{fontSize: '1rem'}}>Faça login para acessar sua conta</p>
            </div>
            
            {/* Card branco */}
            <Card className="border-0 shadow-lg" style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}>
              <CardBody className="p-4 p-sm-5">
                <form className="authentication-form" onSubmit={login}>
                  {/* Campo E-mail */}
                  <div className="mb-4">
                    <label className="form-label fw-medium mb-3" style={{
                      color: '#374151', 
                      fontSize: '0.875rem',
                      letterSpacing: '0.5px'
                    }}>E-mail</label>
                    <div className="position-relative">
                      <div className="position-absolute top-50 start-0 translate-middle-y ps-3" style={{zIndex: 10}}>
                        <IconifyIcon icon="heroicons:envelope" width={18} style={{color: '#9CA3AF'}} />
                      </div>
                      <TextFormInput 
                        control={control} 
                        name="email" 
                        placeholder="seu@email.com" 
                        className="form-control-lg ps-5" 
                        style={{
                          background: '#ffffff',
                          border: '1px solid #E5E7EB',
                          borderRadius: '12px',
                          padding: '0.875rem 1rem 0.875rem 2.75rem',
                          fontSize: '0.875rem',
                          color: '#1F2937',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Campo Senha */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <label className="form-label fw-medium mb-0" style={{
                        color: '#374151', 
                        fontSize: '0.875rem',
                        letterSpacing: '0.5px'
                      }}>Senha</label>
                      <Link 
                        href="/auth/reset-password" 
                        className="text-decoration-none" 
                        style={{
                          color: '#DE488C', 
                          fontSize: '0.8125rem', 
                          fontWeight: '500',
                          transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <div className="position-relative">
                      <div className="position-absolute top-50 start-0 translate-middle-y ps-3" style={{zIndex: 10}}>
                        <IconifyIcon icon="heroicons:lock-closed" width={18} style={{color: '#9CA3AF'}} />
                      </div>
                      <InputGroup>
                        <FormControl
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          className="form-control-lg border-end-0"
                          style={{
                            background: '#ffffff',
                            border: '1px solid #E5E7EB',
                            borderRight: 'none',
                            borderRadius: '12px 0 0 12px',
                            padding: '0.875rem 1rem 0.875rem 2.75rem',
                            fontSize: '0.875rem',
                            color: '#1F2937',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                          {...control.register("password")}
                        />
                        <Button 
                          variant="link" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="border-start-0"
                          style={{
                            background: '#ffffff',
                            border: '1px solid #E5E7EB',
                            borderLeft: 'none',
                            borderRadius: '0 12px 12px 0',
                            color: '#9CA3AF',
                            minWidth: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <IconifyIcon icon={showPassword ? "heroicons:eye-slash" : "heroicons:eye"} width={18} />
                        </Button>
                      </InputGroup>
                    </div>
                  </div>
                  
                  {/* Checkbox Lembrar-me */}
                  <div className="mb-5">
                    <div className="form-check">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="checkbox-signin"
                        style={{
                          background: '#ffffff',
                          borderColor: '#D1D5DB',
                          borderRadius: '4px',
                          transform: 'scale(1.1)'
                        }}
                      />
                      <label 
                        className="form-check-label ms-2" 
                        htmlFor="checkbox-signin"
                        style={{
                          color: '#6B7280', 
                          fontSize: '0.875rem',
                          fontWeight: '400'
                        }}
                      >
                        Lembrar-me neste dispositivo
                      </label>
                    </div>
                  </div>
                  
                  {/* Botão Login */}
                  <div className="d-grid mb-4">
                    <button 
                      disabled={loading} 
                      className="btn btn-lg fw-semibold" 
                      type="submit"
                      style={{
                        background: 'linear-gradient(45deg, #1B1236, #2D1B69)',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#ffffff',
                        padding: '0.875rem 2rem',
                        fontSize: '0.9375rem',
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 15px rgba(27, 18, 54, 0.4)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(27, 18, 54, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(27, 18, 54, 0.4)';
                      }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Entrando...
                        </>
                      ) : (
                        <>
                          <IconifyIcon icon="heroicons:arrow-right" width={18} className="me-2" />
                          Entrar na conta
                        </>
                      )}
                    </button>
                  </div>
                </form>
                
                {/* Link para cadastro */}
                <div className="text-center">
                  <p className="mb-0" style={{
                    color: '#6B7280', 
                    fontSize: '0.875rem',
                    fontWeight: '400'
                  }}>
                    Não tem uma conta? 
                    <Link 
                      href="/auth/sign-up" 
                      className="text-decoration-none fw-semibold ms-1" 
                      style={{
                        color: '#DE488C',
                        transition: 'opacity 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                      Criar conta gratuita
                    </Link>
                  </p>
                </div>
              </CardBody>
            </Card>
            
            {/* Footer com links adicionais */}
            <div className="text-center mt-4">
              <div className="d-flex justify-content-center gap-4">
                <Link href="/auth/login-cliente" className="text-decoration-none" style={{
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: '0.8125rem',
                  fontWeight: '400',
                  transition: 'color 0.2s ease'
                }}>
                  Área do Cliente
                </Link>
                <Link href="/auth/login-parceiro" className="text-decoration-none" style={{
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontSize: '0.8125rem',
                  fontWeight: '400',
                  transition: 'color 0.2s ease'
                }}>
                  Área do Parceiro
                </Link>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SignIn;