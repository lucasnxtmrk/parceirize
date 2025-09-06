import Footer from '@/components/layout/Footer';
import AuthProtectionWrapper from '@/components/wrappers/AuthProtectionWrapper';
import { Container } from 'react-bootstrap';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ClientWrapperLayout from '@/components/layout/ClientWrapperLayout';
import CarrinhoFlutuante from '@/components/CarrinhoFlutuante';
import TopNavigationBar from '@/components/layout/TopNavigationBar/page';
import VerticalNavigationBar from '@/components/layout/VerticalNavigationBarCliente/page';

const AdminLayout = async ({ children }) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'cliente') {
    return redirect('/not-authorized');
  }

  return (
    <AuthProtectionWrapper>
      <ClientWrapperLayout>
        <div className="wrapper">
          <TopNavigationBar />
          <VerticalNavigationBar />
          <div className="page-content">
            <Container fluid>{children}</Container>
            <Footer />
          </div>
          <CarrinhoFlutuante />
        </div>
      </ClientWrapperLayout>
    </AuthProtectionWrapper>
  );
};

export default AdminLayout;
