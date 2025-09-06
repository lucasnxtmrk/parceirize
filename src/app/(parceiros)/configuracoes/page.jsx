import Profile from './components/Profile';
import PageTitle from '@/components/PageTitle';

export const metadata = {
    title: 'Configurações'
};

const Configuracoes = () => {
    return (
        <>
            <PageTitle title="Configurações" subName="Configurações do Parceiro" />
            <Profile />
        </>
    );
};

export default Configuracoes;