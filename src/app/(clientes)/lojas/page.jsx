import PageTransition from '@/components/shared/PageTransition';
import { Row, CardTitle, Badge, Col } from 'react-bootstrap';
import PropertiesData from './components/PropertiesData';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

export const metadata = {
  title: 'Lojas Parceiras - Parceirize'
};

const LojasPage = () => {
  return (
    <PageTransition>
      <div className="lojas-page">
        <ComponentContainerCard id="lojas-parceiras">
        {/* Header aprimorado */}
        <div className="mb-5">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="d-flex align-items-center justify-content-center" style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #1B1236, #DE488C)',
                  borderRadius: '12px',
                  color: 'white'
                }}>
                  <IconifyIcon icon="heroicons:building-storefront" width={24} />
                </div>
                <div>
                  <CardTitle as="h1" className="mb-0 fw-bold" style={{
                    fontSize: '1.75rem',
                    color: 'var(--primary-dark, #1B1236)',
                    letterSpacing: '-0.5px'
                  }}>
                    Lojas Parceiras
                  </CardTitle>
                  <p className="text-muted mb-0 small">
                    Descubra ofertas exclusivas dos nossos parceiros
                  </p>
                </div>
              </div>
            </div>
            
            {/* Stats Badge */}
            <div className="d-flex gap-2">
              <Badge 
                bg="light" 
                text="dark" 
                className="px-3 py-2 fw-medium border"
                style={{
                  borderRadius: '20px',
                  fontSize: '0.8125rem'
                }}
              >
                <IconifyIcon icon="heroicons:fire" className="me-1 text-danger" />
                Ofertas Ativas
              </Badge>
              <Badge 
                bg="light" 
                text="dark" 
                className="px-3 py-2 fw-medium border"
                style={{
                  borderRadius: '20px',
                  fontSize: '0.8125rem'
                }}
              >
                <IconifyIcon icon="heroicons:gift" className="me-1 text-success" />
                Descontos até 50%
              </Badge>
            </div>
          </div>
        </div>

          {/* Content */}
          <PropertiesData />
        </ComponentContainerCard>
      </div>
    </PageTransition>
  );
};

export default LojasPage;