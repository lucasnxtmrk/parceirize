"use client";

import { useSession } from "next-auth/react"; // Importar NextAuth para pegar usuário logado
import Image from 'next/image';
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap';
import { useState } from 'react';

const DigitalWalletCard = () => {
    const { data: session } = useSession(); // Obter os dados do usuário autenticado
    const [showID, setShowID] = useState(false); // Estado para exibir ou ocultar o ID

    // Se o usuário não estiver logado, mostrar mensagem
    if (!session || !session.user) {
        return (
            <Col xl={4}>
                <Card className="bg-dark bg-gradient">
                    <CardBody>
                        <h4 className="text-white">Nenhum usuário autenticado</h4>
                        <p className="text-white-50">Por favor, faça login para ver sua carteirinha.</p>
                    </CardBody>
                </Card>
            </Col>
        );
    }

    const { nome, sobrenome, id_carteirinha, data_ultimo_voucher } = session.user; // Pegando os dados do usuário autenticado

    const nomeCompleto = `${nome} ${sobrenome}`; // Concatenar nome + sobrenome
    const ultimaUtilizacao = data_ultimo_voucher ? new Date(data_ultimo_voucher).toLocaleString("pt-BR") : "Nunca usado"; // Formatando data

    const toggleID = () => {
        setShowID(!showID);
    };

    return (
        <Col xl={4}>
            <Card className="bg-dark bg-gradient">
                <CardBody>
                    <Row className="align-items-center justify-content-between">
                        <Col xl={7} lg={6} md={6}>
                            <h3 className="text-white fw-bold">Carteirinha Digital</h3>
                            <p className="text-white h5">{nomeCompleto}</p> {/* Exibe o nome completo */}
                            <p className="text-white-50">
                                ID Carteirinha: {showID ? id_carteirinha : "*******"}
                            </p> {/* Exibe o ID ou *** */}
                            <p className="text-white-50">Última utilização: {ultimaUtilizacao}</p> {/* Exibe a última vez que usou um voucher */}

                            <Row className="mt-4">
                                <Col lg={12} className="mb-2">
                                    <Button variant="primary" size="sm" className="w-100" onClick={toggleID}>
                                        {showID ? "Ocultar ID" : "Mostrar ID"}
                                    </Button>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </CardBody>
            </Card>
        </Col>
    );
};

export default DigitalWalletCard;
