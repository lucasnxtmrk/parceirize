'use client';

import avatar1 from '@/assets/images/users/dummy-avatar.jpg'; // Importe a imagem apenas uma vez
import { Col, Row, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import Image from 'next/image';
import TextFormInput from '@/components/from/TextFormInput';
import SelectFormInput from '@/components/from/SelectFormInput';
import Avatar from './Avatar'; // Correct path to your Avatar component
import { useForm } from 'react-hook-form';


const Profile = () => {
    const { control } = useForm();

    return (
        <Card>
            <CardHeader>
                <CardTitle as={'h5'} className="anchor" id="basic-wizard">
                    Informações do Perfil
                </CardTitle>
            </CardHeader>
            <CardBody>
                <Row>
                    <Col xs={12}>
                    <div className="avatar-lg mb-3">
                            <div className="avatar-title bg-body rounded-circle border border-3 border-dashed-light position-relative">
                                <Avatar src={avatar1} alt="Preview Image" /> {/* Use o componente Avatar aqui */}
                            </div>
                        </div>
                        <Row>
                            <Col md={6}>
                                <TextFormInput
                                    name="companyName"
                                    label="Nome da Empresa"
                                    placeholder="Digite o nome da empresa"
                                    containerClassName="mb-3"
                                    control={control}
                                />
                            </Col>
                            <Col md={6}>
                                <TextFormInput
                                    name="email"
                                    label="Email"
                                    placeholder="Digite o seu E-mail"
                                    containerClassName="mb-3"
                                    control={control}
                                />
                            </Col>
                            <Col md={6}>
                                <TextFormInput
                                    name="discount"
                                    label="Desconto (%)"
                                    placeholder="Digite o valor do desconto"
                                    containerClassName="mb-3"
                                    control={control}
                                    disabled // Desabilitado para edição
                                />
                            </Col>
                            <Col md={6}>
                                <TextFormInput
                                    name="voucherCode"
                                    label="Código do Voucher"
                                    placeholder="Digite o código do voucher"
                                    containerClassName="mb-3"
                                    control={control}
                                />
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </CardBody>
        </Card>
    );
};

export default Profile;