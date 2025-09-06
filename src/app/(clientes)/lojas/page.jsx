import PageTransition from '@/components/shared/PageTransition';
import { Row } from 'react-bootstrap';
import PropertiesData from './components/PropertiesData';

export const metadata = {
  title: 'Lojas Parceiras'
};

const LojasPage = () => {
  return (
    <PageTransition>
      <Row>
        <PropertiesData />
      </Row>
    </PageTransition>
  );
};

export default LojasPage;