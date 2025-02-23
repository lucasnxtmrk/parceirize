import PageTitle from '@/components/PageTitle';
import { Row } from 'react-bootstrap';
import BalanceCard from './components/BalanceCard';
import DigitalWalletCard from './components/DigitalWalletCard';
import SalesChart from './components/SalesChart';
import SocialSource from './components/SocialSource';
import Statistics from './components/Statistics';
import Transaction from './components/Transaction';
export const metadata = {
  title: 'Carteirinha digital'
};
const AnalyticsPage = () => {
  return <>
      <PageTitle title="Carteirinha" subName="Digital" />
      <Row>
        <DigitalWalletCard/>
      </Row>
    </>;
};
export default AnalyticsPage;