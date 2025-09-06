import Profile from './components/Profile';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { CardTitle } from 'react-bootstrap';

export const metadata = {
    title: 'Configurações'
};

const Configuracoes = () => {
    return (
        <ComponentContainerCard id="configuracoes-parceiro">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle as="h4" className="mb-0">Configurações</CardTitle>
            </div>
            <Profile />
        </ComponentContainerCard>
    );
};

export default Configuracoes;