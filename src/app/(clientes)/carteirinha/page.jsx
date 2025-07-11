import PageTitle from '@/components/PageTitle';
import { Row } from 'react-bootstrap';
import DigitalWalletCard from './components/DigitalWalletCard';

export const metadata = {
  title: 'Carteirinha digital'
};
const AnalyticsPage = () => {
  return <>
      {/* <PageTitle title="Carteirinha" subName="Digital" /> */}
      <Row>
        <DigitalWalletCard/>
      </Row>
    </>;
};
export default AnalyticsPage;