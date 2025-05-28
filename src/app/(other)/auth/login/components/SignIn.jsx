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
    document.body.classList.add('authentication-bg');
    return () => {
      document.body.classList.remove('authentication-bg');
    };
  }, []);

  const { loading, login, control } = useSignIn();

  // Estado para controlar a visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="account-pages pt-2 pt-sm-5 pb-4 pb-sm-5">
      <Container>
        <Row className="justify-content-center">
          <Col xl={5}>
            <Card className="auth-card">
              <CardBody className="px-3 py-5">
                <div className="mx-auto mb-4 text-center auth-logo">
                  <Link href="/carteirinha" className="logo-dark">
                    <Image src={logoDark} height={32} alt="logo dark" />
                  </Link>
                  <Link href="/carteirinha" className="logo-light">
                    <Image src={LogoLight} height={28} alt="logo light" />
                  </Link>
                </div>
                <h2 className="fw-bold text-uppercase text-center fs-18">Parceiros Protege</h2>
                <p className="text-muted text-center mt-1 mb-4">Entre com o seu e-mail e senha.</p>
                <div className="px-4">
                  <form className="authentication-form" onSubmit={login}>
                    <div className="mb-3">
                      <TextFormInput control={control} name="email" placeholder="Digite seu e-mail" className="bg-light bg-opacity-50 border-light py-2" label="E-mail" />
                    </div>
                    <div className="mb-3">
                      <Link href="/auth/reset-password" className="float-end text-muted text-unline-dashed ms-1">
                        Redefinir senha
                      </Link>
                      <label className="form-label">Senha</label>
                      <InputGroup className="mb-3">
                        <FormControl
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          className="bg-light bg-opacity-50 border-light py-2"
                          {...control.register("password")}
                        />
                        <Button variant="outline-primary" onClick={() => setShowPassword(!showPassword)}>
                          <IconifyIcon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} width={20} />
                        </Button>
                      </InputGroup>
                    </div>
                    <div className="mb-3">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="checkbox-signin" />
                        <label className="form-check-label" htmlFor="checkbox-signin">
                          Lembrar-me
                        </label>
                      </div>
                    </div>
                    <div className="mb-1 text-center d-grid">
                      <button disabled={loading} className="btn btn-success py-2 fw-medium" type="submit">
                        Entrar
                      </button>
                    </div>
                  </form>
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
