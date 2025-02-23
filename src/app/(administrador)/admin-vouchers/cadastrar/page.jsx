
import CadastrarVoucher from './components/CadastrarVoucher'; // Importe o componente
import { Container } from 'react-bootstrap'; // Se quiser usar o Container do Bootstrap

const MyPage = () => {
    return (
        <Container> {/* Opcional: use o Container do Bootstrap para centralizar */}
            <CadastrarVoucher />
        </Container>
    );
};

export default MyPage;