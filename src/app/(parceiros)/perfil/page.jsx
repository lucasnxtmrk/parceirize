import Profile from './components/Profile'; // Importe o novo componente
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { CardTitle } from 'react-bootstrap';

export const metadata = {
    title: 'Perfil' // Título da página
};

const Perfil = () => {  // Ou o nome que você preferir (ex: Profile)
    return (
        <ComponentContainerCard id="perfil-parceiro">
            {/* Cabeçalho: Título */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <CardTitle as="h4" className="mb-0">Perfil - Informações do Usuário</CardTitle>
            </div>

            <Profile /> {/* Renderiza o componente ProfilePage */}
        </ComponentContainerCard>
    );
};

export default Perfil; // Ou export default Profile;