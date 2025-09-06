import PageTitle from '@/components/PageTitle';
import { Row } from 'react-bootstrap';
import PropertiesData from './components/PropertiesData';
export const metadata = {
  title: 'Lojas'
};
const PropertyGridPage = () => {
  return <>
      {/* <PageTitle title="Vouchers" subName="Parceiros" /> */}
      <Row>
        <PropertiesData />
      </Row>
    </>;
};
export default PropertyGridPage;