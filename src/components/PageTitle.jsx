import { Col, Row } from 'react-bootstrap';
import IconifyIcon from './wrappers/IconifyIcon';
import Link from 'next/link';
const PageTitle = ({
  title,
  subName
}) => {
  return (
    <div className="page-header mb-4" style={{padding: '1.5rem 0 2rem 0', borderBottom: '1px solid #e2e8f0'}}>
      <Row>
        <Col xs={12}>
          <div className="page-title-box">
            <h4 className="mb-2 fw-semibold" style={{color: '#0f172a', fontSize: '1.875rem'}}>{title}</h4>
            <ol className="breadcrumb mb-0" style={{fontSize: '0.875rem'}}>
              <li className="breadcrumb-item">
                <Link href="" style={{color: '#64748b', textDecoration: 'none'}}>{subName}</Link>
              </li>
              <li style={{color: '#cbd5e1', margin: '0 0.5rem'}}>•</li>
              <li className="breadcrumb-item active" style={{color: '#3b82f6'}}>{title}</li>
            </ol>
          </div>
        </Col>
      </Row>
    </div>
  );
};
export default PageTitle;