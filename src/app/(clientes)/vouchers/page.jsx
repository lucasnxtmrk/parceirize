import ComponentContainerCard from '@/components/ComponentContainerCard';
import { Row, CardTitle } from 'react-bootstrap';
import PropertiesData from './components/PropertiesData';
export const metadata = {
  title: 'Lojas'
};
const PropertyGridPage = () => {
  return (
    <ComponentContainerCard id="vouchers-clientes">
      {/* Cabeçalho: Título */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <CardTitle as="h4" className="mb-0">Vouchers Disponíveis</CardTitle>
      </div>

      <Row>
        <PropertiesData />
      </Row>
    </ComponentContainerCard>
  );
};
export default PropertyGridPage;