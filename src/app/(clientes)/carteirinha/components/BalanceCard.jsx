import moneyImg from '@/assets/images/money.png';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { currency } from '@/context/constants';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Card, CardBody, CardFooter, CardTitle, Col, ProgressBar, Row } from 'react-bootstrap';
import { propertyData } from '../data';
const BalanceCard = () => {
  return <Col xl={4}>
      <Card className="bg-primary bg-gradient">
        <CardBody>
          <Row className="align-items-center justify-content-between">
            <Col xl={7} lg={6} md={6}>
              <h3 className="text-white fw-bold">{currency}117,000.43</h3>
              <p className="text-white-50">My Balance</p>
              <Row className="mt-4">
                <Col lg={12} className="mb-2" md={6} xs={6}>
                  <div className="d-flex gap-2">
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-success bg-opacity-50 text-white rounded">
                        <IconifyIcon icon="ri:arrow-down-line" className=" fs-4" />
                      </span>
                    </div>
                    <div className="d-block">
                      <h5 className="text-white fw-medium mb-0">{currency}13,321.12</h5>
                      <p className="mb-0 text-white-50">Income</p>
                    </div>
                  </div>
                </Col>
                <Col lg={6} md={6} xs={6}>
                  <div className="d-flex gap-2">
                    <div className="avatar-sm flex-shrink-0">
                      <span className="avatar-title bg-danger bg-opacity-50 text-white rounded">
                        <IconifyIcon icon="ri:arrow-up-line" className=" fs-4" />
                      </span>
                    </div>
                    <div className="d-block">
                      <h5 className="text-white fw-medium mb-0">{currency}7,566.11</h5>
                      <p className="mb-0 text-white-50">Expanse</p>
                    </div>
                  </div>
                </Col>
              </Row>
              <Row className="mt-3 g-2">
                <Col xl={6} lg={6} md={6}>
                  <Button variant="warning" size="sm" className="w-100">
                    Send
                  </Button>
                </Col>
                <Col xl={6} lg={6} md={6}>
                  <Button size="sm" className="bg-light bg-opacity-25 text-white w-100">
                    Receive
                  </Button>
                </Col>
              </Row>
            </Col>
            <Col xl={5} lg={4} md={4}>
              <Image src={moneyImg} alt="money" className="img-fluid" />
            </Col>
          </Row>
        </CardBody>
      </Card>
    </Col>;
};
export default BalanceCard;