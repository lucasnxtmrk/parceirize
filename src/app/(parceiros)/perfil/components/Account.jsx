import TextFormInput from '@/components/from/TextFormInput';
import { Col, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';

const Account = () => {
    const { control } = useForm();
    return (
        <>
            <h4 className="fs-16 fw-semibold mb-1">Informações da Empresa</h4>
            <Row>
                <Col lg={6}>
                    <TextFormInput 
                        name="companyName" 
                        label="Nome da Empresa" 
                        control={control} 
                        placeholder="Digite o nome da empresa" 
                        containerClassName="mb-3" 
                    />
                </Col>
                <Col lg={6}>
                    <TextFormInput 
                        name="voucherCode" 
                        label="Código do Voucher" 
                        control={control} 
                        placeholder="Digite o código do voucher" 
                        containerClassName="mb-3" 
                    />
                </Col>
                <Col lg={6}>
                    <TextFormInput 
                        name="discount" 
                        label="Desconto (%)" 
                        control={control} 
                        placeholder="Digite o valor do desconto" 
                        containerClassName="mb-3" 
                        disabled // Desabilitado para edição
                    />
                </Col>
            </Row>
        </>
    );
};

export default Account;