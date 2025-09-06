import ComponentContainerCard from '@/components/ComponentContainerCard';
import CustomerByCountry from './components/CustomerByCountry';
import CustomerCountry from './components/CustomerCountry';
import CustomersInvest from './components/CustomersInvest';
import PropertyInvestor from './components/PropertyInvestor';
import TopCustomer from './components/TopCustomer';
import CustomerVisit from './components/CustomerVisit';
import PurchaseProperty from './components/PurchaseProperty';
import { Col, Row, CardTitle } from 'react-bootstrap';
export const metadata = {
  title: 'Customers'
};
const CustomerPage = () => {
  return (
    <ComponentContainerCard id="visao-geral-parceiro">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <CardTitle as="h4" className="mb-0">Visão Geral</CardTitle>
      </div>
      <Row>
        <Col xl={8} lg={12}>
          <CustomerCountry />
          <Row>
            <Col lg={6}></Col>
          </Row>
        </Col>
        <PropertyInvestor />
      </Row>
      <Row>
        <CustomersInvest />
        <CustomerByCountry />
      </Row>
      <Row>
        <TopCustomer />
        <CustomerVisit />
        <PurchaseProperty />
      </Row>
    </ComponentContainerCard>
  );
};
export default CustomerPage;