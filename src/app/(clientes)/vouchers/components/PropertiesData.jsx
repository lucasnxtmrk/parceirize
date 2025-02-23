'use client'; 
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getAllProperty } from '@/helpers/data';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardBody, CardFooter, Col, Row } from 'react-bootstrap';
import { useState } from 'react'; // Importe useState aqui

const PropertiesCard = ({
  bath,
  beds,
  flor,
  size: ft,
  icon,
  id,
  location,
  name,
  price,
  type,
  variant,
  save,
  image,
  voucher,
  desconto,
}) => {
  const [copied, setCopied] = useState(false); // Estado para controlar o texto e ícone

  const handleCopy = () => {
    navigator.clipboard.writeText(voucher); // Copia o voucher
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
};


  return <Card className="overflow-hidden">
      <div className="position-relative" style={{ height: '150px', overflow: 'hidden' }}>
  <Image 
    src={image} 
    alt="properties" 
    className="img-fluid rounded-top" 
    width={300} 
    height={200} 
    style={{ objectFit: 'cover', width: '100%', height: '100%' }} 
  />
</div>
      <CardBody>
        <div className="d-flex align-items-center gap-2">
          <div>
            <Link href="" className="text-dark fw-medium fs-16">
              {name}
            </Link>
            <p className="fw-medium mb-0">{location}</p>
            <p className="text-muted mb-0">{desconto} de desconto</p>

          </div>
        </div>
        <Row className="mt-2 g-2">
        </Row>
      </CardBody>
      <CardFooter className="bg-light-subtle d-flex justify-content-between align-items-center border-top">
    <div className="d-flex align-items-center"> {/* Div para o location */}
        <p className="text-muted mb-0">{voucher}</p>
    </div>
    <div> {/* Div para o botão copiar */}
        <Link href="" className="link-primary fw-medium" onClick={handleCopy}>
            {copied ? (
                <>
                    Copiado <IconifyIcon icon="ri-check-line" className="align-middle" />
                </>
            ) : (
                <>
                    Copiar <IconifyIcon icon="ri-file-copy-line" className="align-middle" />
                </>
            )}
        </Link>
    </div>
</CardFooter>
    </Card>;
};
const PropertiesData = async () => {
  const propertiesData = await getAllProperty();
  return <Col xl={9} lg={12}>
      <Row>
        {propertiesData.map((item, idx) => <Col lg={4} md={6} key={idx}>
            <PropertiesCard {...item} />
          </Col>)}
      </Row>
      <div className="p-3 border-top">
        <nav aria-label="Page navigation example">
          <ul className="pagination justify-content-end mb-0">
            <li className="page-item">
              <Link className="page-link" href="">
                Anterior
              </Link>
            </li>
            <li className="page-item active">
              <Link className="page-link" href="">
                1
              </Link>
            </li>
            <li className="page-item">
              <Link className="page-link" href="">
                2
              </Link>
            </li>
            <li className="page-item">
              <Link className="page-link" href="">
                3
              </Link>
            </li>
            <li className="page-item">
              <Link className="page-link" href="">
                Próximo
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </Col>;
};
export default PropertiesData;