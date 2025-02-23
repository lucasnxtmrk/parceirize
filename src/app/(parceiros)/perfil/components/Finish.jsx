import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Col, Row } from 'react-bootstrap';

const Finish = () => {
    return (
        <Row>
            <Col xs={12}>
                <div className="text-center">
                    <IconifyIcon icon="iconamoon:like-duotone" className="fs-36 text-primary mb-3" /> {/* Ícone centralizado e colorido */}
                    <h3 className="mt-0">Concluído!</h3>
                    <p className="w-75 mb-2 mx-auto">Informações atualizadas com sucesso.</p>
                </div>
            </Col>
        </Row>
    );
};

export default Finish;