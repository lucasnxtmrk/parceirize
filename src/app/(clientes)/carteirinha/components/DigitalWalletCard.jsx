'use client';

import qrCode from '@/assets/images/qrcode.png'; // Importe a imagem do QR Code
import moneyImg from '@/assets/images/no-qrcode.png';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { currency } from '@/context/constants';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Card, CardBody, CardFooter, CardTitle, Col, ProgressBar, Row } from 'react-bootstrap';
import { useState } from 'react'; // Import useState

const DigitalWalletCard = () => {
    const [showQRCode, setShowQRCode] = useState(false); // Estado para controlar a exibição do QR Code
    const userId = "12345624XX3"; // Substitua pelo ID real do usuário

    const toggleQRCode = () => {
        setShowQRCode(!showQRCode);
    };

    return (
        <Col xl={4}>
            <Card className="bg-dark bg-gradient">
                <CardBody>
                    <Row className="align-items-center justify-content-between">
                        <Col xl={7} lg={6} md={6}>
                            <h3 className="text-white fw-bold">Carteirinha Digital</h3>
                            <p className="text-white h5">Lucas Oliveira</p> {/* Exiba o nome do cliente */}
                            <p className="text-white-50">ID: {userId}</p> {/* Exiba o ID do usuário */}

                            <Row className="mt-4">
                                <Col lg={12} className="mb-2">
                                    <Button variant="primary" size="sm" className="w-100" onClick={toggleQRCode}>
                                        {showQRCode ? "Esconder QR Code" : "Mostrar QR Code"}
                                    </Button>
                                </Col>
                            </Row>

                        </Col>
                        <Col xl={5} lg={4} md={4} className="text-center"> {/* Centraliza a imagem */}
                            {showQRCode ? (
                                <Image src={qrCode} alt="QR Code" width={150} height={150} /> // Exibe o QR Code
                            ) : (
                                <Image src={moneyImg} alt="Wallet Icon" className="img-fluid" width={150} height={150} /> // Exibe o ícone da carteira
                            )}
                        </Col>
                    </Row>
                </CardBody>
            </Card>
        </Col>
    );
};

export default DigitalWalletCard;