'use client';

import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Link from 'next/link';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

const HomeContent = () => {
  return (
    <div className="min-vh-100" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Container className="py-5">
        <Row className="justify-content-center text-center text-white">
          <Col lg={8}>
            {/* Header */}
            <div className="mb-5">
              <h1 className="display-4 fw-bold mb-4">
                Bem-vindo ao Parceirize
              </h1>
              <p className="lead mb-4">
                A plataforma completa para gestão de clubes de desconto e programas de benefícios.
                Conecte empresas, parceiros e clientes em um único ecossistema.
              </p>
            </div>

            {/* Features */}
            <Row className="mb-5">
              <Col md={4} className="mb-4">
                <Card className="h-100 border-0 shadow-lg" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Card.Body className="text-center text-white">
                    <IconifyIcon icon="heroicons:building-office" width={48} className="mb-3" />
                    <h5>Para Empresas</h5>
                    <p>Gerencie seu clube de desconto com ferramentas profissionais</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-4">
                <Card className="h-100 border-0 shadow-lg" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Card.Body className="text-center text-white">
                    <IconifyIcon icon="heroicons:building-storefront" width={48} className="mb-3" />
                    <h5>Para Parceiros</h5>
                    <p>Aumente suas vendas participando de clubes de desconto</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="mb-4">
                <Card className="h-100 border-0 shadow-lg" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Card.Body className="text-center text-white">
                    <IconifyIcon icon="heroicons:users" width={48} className="mb-3" />
                    <h5>Para Clientes</h5>
                    <p>Aproveite descontos exclusivos na sua carteirinha digital</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Login Options */}
            <div className="mb-5">
              <h3 className="mb-4">Acesse sua área</h3>
              <Row className="justify-content-center">
                <Col sm={6} md={3} className="mb-3">
                  <Link href="/login" className="text-decoration-none">
                    <Card className="border-0 shadow-lg h-100" style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      transition: 'transform 0.2s ease'
                    }}>
                      <Card.Body className="text-center">
                        <IconifyIcon icon="heroicons:identification" width={32} className="mb-2 text-primary" />
                        <h6 className="text-dark">Área do Cliente</h6>
                        <small className="text-muted">Carteirinha digital</small>
                      </Card.Body>
                    </Card>
                  </Link>
                </Col>
                <Col sm={6} md={3} className="mb-3">
                  <Link href="/parceiro/login" className="text-decoration-none">
                    <Card className="border-0 shadow-lg h-100" style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      transition: 'transform 0.2s ease'
                    }}>
                      <Card.Body className="text-center">
                        <IconifyIcon icon="heroicons:building-storefront" width={32} className="mb-2 text-success" />
                        <h6 className="text-dark">Área do Parceiro</h6>
                        <small className="text-muted">Painel de vendas</small>
                      </Card.Body>
                    </Card>
                  </Link>
                </Col>
                <Col sm={6} md={3} className="mb-3">
                  <Link href="/admin/login" className="text-decoration-none">
                    <Card className="border-0 shadow-lg h-100" style={{
                      background: 'rgba(255, 255, 255, 0.9)',
                      transition: 'transform 0.2s ease'
                    }}>
                      <Card.Body className="text-center">
                        <IconifyIcon icon="heroicons:building-office" width={32} className="mb-2 text-info" />
                        <h6 className="text-dark">Área do Provedor</h6>
                        <small className="text-muted">Gestão empresarial</small>
                      </Card.Body>
                    </Card>
                  </Link>
                </Col>
              </Row>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="mb-0" style={{ opacity: 0.8 }}>
                © 2024 Parceirize. Desenvolvido pela NEXTMARK.
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HomeContent;