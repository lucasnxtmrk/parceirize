import ComponentContainerCard from '@/components/ComponentContainerCard';
import { CardTitle, Row } from 'react-bootstrap';
import DigitalWalletCard from './components/DigitalWalletCard';

export const metadata = {
  title: 'Carteirinha digital'
};
const AnalyticsPage = () => {
  return (
    <ComponentContainerCard id="carteirinha-digital">
      {/* Cabeçalho: Título */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <CardTitle as="h4" className="mb-0">Carteirinha Digital</CardTitle>
      </div>

      <Row className="justify-content-center">
        <DigitalWalletCard/>
      </Row>
    </ComponentContainerCard>
  );
};
export default AnalyticsPage;