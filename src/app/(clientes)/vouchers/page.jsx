import PageTitle from '@/components/PageTitle';
import { Row } from 'react-bootstrap';
import PropertiesData from './components/PropertiesData';
import PropertiesFilter from './components/PropertiesFilter';
export const metadata = {
  title: 'Vouchers'
};
const PropertyGridPage = () => {
  return <>
      <PageTitle title="Vouchers" subName="Parceiros" />
      <Row>
        <PropertiesFilter />
        <PropertiesData />
      </Row>
    </>;
};
export default PropertyGridPage;