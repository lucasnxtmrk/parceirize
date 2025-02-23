import { Accordion, AccordionBody, AccordionHeader, AccordionItem, Button, Col, Row } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { faqData } from './data';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'FAQs'
};
const GeneralFaq = () => {
  return <>
      <h4 className="mb-3 fw-semibold fs-16">Geral</h4>
      <Accordion alwaysOpen defaultActiveKey={'0'}>
        {faqData.Geral.map((faq, idx) => <AccordionItem eventKey={`${idx}`} key={idx}>
            <AccordionHeader>
              <div className="fw-medium">{faq.question}</div>
            </AccordionHeader>
            <AccordionBody>{faq.answer}</AccordionBody>
          </AccordionItem>)}
      </Accordion>
    </>;
};
const RefundFaqs = () => {
  return <>
      <h4 className="mb-3 mt-4 fw-semibold fs-16">Carteirinha</h4>
      <Accordion alwaysOpen defaultActiveKey={'0'}>
        {faqData.Carteirinha.map((faq, idx) => <AccordionItem eventKey={`${idx}`} key={idx}>
            <AccordionHeader>
              <div className="fw-medium">{faq.question}</div>
            </AccordionHeader>
            <AccordionBody>{faq.answer}</AccordionBody>
          </AccordionItem>)}
      </Accordion>
    </>;
};
const PaymentsFaqs = () => {
  return <>
      <h4 className="mb-3 fw-semibold fs-16">Vouchers</h4>
      <Accordion alwaysOpen defaultActiveKey={'0'}>
        {faqData.Vouchers.map((faq, idx) => <AccordionItem eventKey={`${idx}`} key={idx}>
            <AccordionHeader>
              <div className="fw-medium">{faq.question}</div>
            </AccordionHeader>
            <AccordionBody>{faq.answer}</AccordionBody>
          </AccordionItem>)}
      </Accordion>
    </>;
};
const SupportFaqs = () => {
  return <>
      <h4 className="mb-3 mt-4 fw-semibold fs-16">Parceiros</h4>
      <Accordion alwaysOpen defaultActiveKey={'0'}>
        {faqData.Parceiros.map((faq, idx) => <AccordionItem eventKey={`${idx}`} key={idx}>
            <AccordionHeader>
              <div className="fw-medium">{faq.question}</div>
            </AccordionHeader>
            <AccordionBody>{faq.answer}</AccordionBody>
          </AccordionItem>)}
      </Accordion>
    </>;
};
const FAQs = () => {
  return <>
      <PageTitle title="FAQs" subName="Pages" />
      <Row>
        <Col>
          <Row className="g-xl-4">
            <Col xl={6}>
              <GeneralFaq />
              <RefundFaqs />
            </Col>
            <Col xl={6}>
              <PaymentsFaqs />
              <SupportFaqs />
            </Col>
          </Row>
        </Col>
      </Row>
    </>;
};
export default FAQs;