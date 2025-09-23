'use client';

import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Image from 'next/image';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

const HomeContent = () => {
  const openWhatsApp = () => {
    window.open('https://wa.me/5583988605313?text=Olá! Gostaria de saber mais sobre o Parceirize.', '_blank');
  };

  const styles = {
    main: {
      background: '#0a0a0a',
      color: '#f8f9fa',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center'
    },
    whatsappBtn: {
      background: '#25D366',
      border: 'none',
      borderRadius: '8px',
      padding: '16px 32px',
      fontSize: '16px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '500',
      color: '#f8f9fa',
      marginBottom: '24px',
      textAlign: 'center'
    },
    subtitle: {
      fontSize: '1.1rem',
      color: '#9ca3af',
      textAlign: 'center',
      marginBottom: '40px',
      lineHeight: '1.6'
    }
  };

  return (
    <div style={styles.main}>
      <Container>
        <Row className="justify-content-center text-center">
          <Col lg={6} md={8}>

            {/* Logo */}
            <div className="mb-5">
              <Image
                src="/assets/parceiros/logo-parceirize-02.png"
                alt="Parceirize"
                width={280}
                height={120}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  filter: 'brightness(0) invert(1)' // Logo branca no fundo escuro
                }}
                priority
              />
            </div>

            {/* Título */}
            <h1 style={styles.title}>
              Plataforma SaaS de Clubes de Desconto
            </h1>

            {/* Subtítulo */}
            <p style={styles.subtitle}>
              Para mais informações sobre nossa plataforma multi-tenant<br />
              e como implementar seu clube de desconto personalizado,<br />
              entre em contato com nosso suporte especializado.
            </p>

            {/* Botão WhatsApp */}
            <Button
              style={styles.whatsappBtn}
              onClick={openWhatsApp}
              onMouseOver={(e) => {
                e.target.style.background = '#1DA851';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#25D366';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <IconifyIcon icon="mdi:whatsapp" width={20} className="me-2" />
              Falar com Suporte
            </Button>

            {/* Rodapé */}
            <div style={{
              marginTop: '60px',
              paddingTop: '40px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{
                fontSize: '0.9rem',
                color: '#6b7280',
                marginBottom: '0'
              }}>
                © 2025 Parceirize • Desenvolvido pela{' '}
                <span style={{ color: '#25D366', fontWeight: '500' }}>NEXTMARK</span>
              </p>
            </div>

          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HomeContent;