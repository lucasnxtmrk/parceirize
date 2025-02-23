'use client';

import Image from 'next/image';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import logoEmpresa from '@/assets/images/logo_empresa.jpg';

const VoucherCard = ({ voucher }) => {
    return (
        <Col xl={4} className="ps-0">
            <Card className="bg-dark bg-gradient">
                <CardBody className="p-4"> {/* Adicionado padding ao CardBody */}
                    <Row className="g-3 align-items-center"> {/* Espaçamento entre os elementos */}
                        <Col xs={12} className="d-flex align-items-center">
                            <div className="rounded-circle overflow-hidden me-3" style={{ width: '70px', height: '70px' }}>
                                <Image
                                    src={logoEmpresa}
                                    alt="Logo da Empresa"
                                    width={70}
                                    height={70}
                                    className="img-fluid"
                                />
                            </div>
                            <div>
                                <h3 className="text-white fw-bold mb-1">{voucher.nome}</h3>
                                <p className="text-white h5 mb-1">{voucher.descricao}</p>
                                <p className="text-white-50 small mb-0">Código: {voucher.codigo}</p>
                                <p className="text-white-50 small">Validade: {voucher.validade}</p>
                            </div>
                        </Col>
                    </Row>
                </CardBody>
            </Card>
        </Col>
    );
};

export default VoucherCard;