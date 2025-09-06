import ComponentContainerCard from '@/components/ComponentContainerCard';
import CadastrarVoucher from './components/CadastrarVoucher'; // Importe o componente
import { CardTitle } from 'react-bootstrap'; // Se quiser usar o Container do Bootstrap

const MyPage = () => {
    return (
        <ComponentContainerCard id="cadastrar-voucher">
            {/* Cabeçalho: Título */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle as="h4" className="mb-0">Cadastrar Voucher</CardTitle>
            </div>

            <CadastrarVoucher />
        </ComponentContainerCard>
    );
};

export default MyPage;