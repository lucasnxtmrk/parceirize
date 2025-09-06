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
    document.body.style.backgroundColor = '#f8fafc';
    document.body.style.fontFamily = 'Inter, system-ui, sans-serif';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.fontFamily = '';
    };
  }, []);

  const { loading, login, control } = useSignIn();

  // Estado para controlar a visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{backgroundColor: '#f8fafc'}}>
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <div className="text-center mb-5">
              <Link href="/" className="d-inline-block mb-4">
                <Image src={LogoLight} height={40} alt="logo" className="img-fluid" />
              </Link>
              <h1 className="mb-2" style={{color: '#0f172a', fontWeight: '600', fontSize: '1.875rem'}}>Bem-vindo de volta</h1>
              <p className="text-muted mb-0" style={{color: '#64748b', fontSize: '1rem'}}>Entre com suas credenciais para acessar sua conta</p>
            </div>
            
            <Card className="border-0 shadow-card" style={{backgroundColor: '#ffffff', borderRadius: '16px'}}>
              <CardBody className="p-4 p-sm-5">
                <form className="authentication-form" onSubmit={login}>
                  <div className="mb-4">
                    <label className="form-label fw-medium mb-2" style={{color: '#374151', fontSize: '0.875rem'}}>E-mail</label>
                    <TextFormInput 
                      control={control} 
                      name="email" 
                      placeholder="seu@email.com" 
                      className="form-control-lg" 
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label fw-medium mb-0" style={{color: '#374151', fontSize: '0.875rem'}}>Senha</label>
                      <Link 
                        href="/auth/reset-password" 
                        className="text-decoration-none" 
                        style={{color: '#3b82f6', fontSize: '0.8125rem', fontWeight: '500'}}
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                    <InputGroup>
                      <FormControl
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        className="form-control-lg"
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRight: 'none',
                          borderRadius: '8px 0 0 8px',
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          backgroundColor: '#ffffff'
                        }}
                        {...control.register("password")}
                      />
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderLeft: 'none',
                          borderRadius: '0 8px 8px 0',
                          backgroundColor: '#ffffff',
                          color: '#64748b'
                        }}
                      >
                        <IconifyIcon icon={showPassword ? "heroicons:eye-slash" : "heroicons:eye"} width={18} />
                      </Button>
                    </InputGroup>
                  </div>
                  
                  <div className="mb-4">
                    <div className="form-check">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="checkbox-signin"
                        style={{
                          borderColor: '#e2e8f0',
                          borderRadius: '4px'
                        }}
                      />
                      <label 
                        className="form-check-label" 
                        htmlFor="checkbox-signin"
                        style={{color: '#475569', fontSize: '0.875rem'}}
                      >
                        Lembrar-me neste dispositivo
                      </label>
                    </div>
                  </div>
                  
                  <div className="d-grid">
                    <button 
                      disabled={loading} 
                      className="btn btn-primary btn-lg" 
                      type="submit"
                      style={{
                        backgroundColor: '#3b82f6',
                        borderColor: '#3b82f6',
                        borderRadius: '8px',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        boxShadow: 'none'
                      }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Entrando...
                        </>
                      ) : (
                        'Entrar na conta'
                      )}
                    </button>
                  </div>
                </form>
                
                <div className="text-center mt-4 pt-3" style={{borderTop: '1px solid #e2e8f0'}}>
                  <p className="mb-0" style={{color: '#64748b', fontSize: '0.875rem'}}>
                    Não tem uma conta? 
                    <Link href="/auth/sign-up" className="text-decoration-none fw-medium" style={{color: '#3b82f6', marginLeft: '0.25rem'}}>
                      Criar conta
                    </Link>
                  </p>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SignIn;
