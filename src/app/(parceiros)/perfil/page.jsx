import Profile from './components/Profile'; // Importe o novo componente
import PageTitle from '@/components/PageTitle';

export const metadata = {
    title: 'Perfil' // Título da página
};

const Perfil = () => {  // Ou o nome que você preferir (ex: Profile)
    return (
        <>
            <PageTitle title="Perfil" subName="Informações do Usuário" /> {/* Título e subtítulo */}
            <Profile /> {/* Renderiza o componente ProfilePage */}
        </>
    );
};

export default Perfil; // Ou export default Profile;