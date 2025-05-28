"use client";

import Image from 'next/image';
import { Card, CardBody, Col, Row } from 'react-bootstrap';

const VoucherCard = ({ voucher }) => {
    return (
        <Col xl={4} className="ps-0">
            <Card className="bg-primary">
                <CardBody className="p-4">
                    <Row className="g-3 align-items-center">
                        <Col xs={12} className="d-flex align-items-center">
                            <div className="rounded-circle overflow-hidden me-3" style={{ width: '70px', height: '70px' }}>
                                {voucher.logo ? (
                                    <Image
                                        src={voucher.logo}
                                        alt="Logo da Empresa"
                                        width={90}
                                        height={90}
                                        className="img-fluid"
                                    />
                                ) : (
                                    <div style={{
                                        width: "70px",
                                        height: "70px",
                                        backgroundColor: "#ccc",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "#000"
                                    }}>
                                        N/A
                                    </div>
                                )}
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
