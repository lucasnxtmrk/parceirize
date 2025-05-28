import { Accordion, AccordionBody, AccordionHeader, AccordionItem, Button, Col, Row } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { faqData } from './data';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'FAQs'
};
const GeneralFaq = () => {
  return <>
      <h4 className="mb-0 mt-4 fw-semibold fs-20">Geral</h4>
      <Accordion alwaysOpen defaultActiveKey={'0'}>
        {faqData.Geral.map((faq, idx) => <AccordionItem eventKey={`${idx}`} key={idx}>
            <AccordionHeader>
              <h5 className="fw-medium">{faq.question}</h5>
            </AccordionHeader>
            <AccordionBody>{faq.answer}</AccordionBody>
          </AccordionItem>)}
      </Accordion>
    </>;
};
const RefundFaqs = () => {
  return <>
      <h4 className="mb-0 mt-4 fw-semibold fs-20">Carteirinha</h4>
      <Accordion alwaysOpen defaultActiveKey={'0'}>
        {faqData.Carteirinha.map((faq, idx) => <AccordionItem eventKey={`${idx}`} key={idx}>
            <AccordionHeader>
              <h5 className="fw-medium">{faq.question}</h5>
            </AccordionHeader>
            <AccordionBody>{faq.answer}</AccordionBody>
          </AccordionItem>)}
      </Accordion>
    </>;
};
const PaymentsFaqs = () => {
  return <>
      <h4 className="mb-0 mt-4 fw-semibold fs-20">Vouchers</h4>
      <Accordion alwaysOpen defaultActiveKey={'0'}>
        {faqData.Vouchers.map((faq, idx) => <AccordionItem eventKey={`${idx}`} key={idx}>
            <AccordionHeader>
              <h5 className="fw-medium">{faq.question}</h5>
            </AccordionHeader>
            <AccordionBody>{faq.answer}</AccordionBody>
          </AccordionItem>)}
      </Accordion>
    </>;
};
const SupportFaqs = () => {
  return <>
      <h4 className="mb-0 mt-4 fw-semibold fs-20">Parceiros</h4>
      <Accordion alwaysOpen defaultActiveKey={'0'}>
        {faqData.Parceiros.map((faq, idx) => <AccordionItem eventKey={`${idx}`} key={idx}>
            <AccordionHeader>
              <h5 className="fw-medium">{faq.question}</h5>
            </AccordionHeader>
            <AccordionBody >{faq.answer}</AccordionBody>
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

                          <GeneralFaq />
              <RefundFaqs />
                            <PaymentsFaqs />
              <SupportFaqs />

          </Row>
        </Col>
      </Row>
    </>;
};
export default FAQs;