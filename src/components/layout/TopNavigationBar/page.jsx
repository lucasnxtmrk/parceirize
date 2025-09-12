'use client';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import LeftSideBarToggle from './components/LeftSideBarToggle';
import ProfileDropdown from './components/ProfileDropdown';
import ThemeCustomizerToggle from './components/ThemeCustomizerToggle';
import Notifications from './components/Notifications';
import MaximizeScreen from './components/MaximizeScreen';
import LogoutButton from './components/LogoutButton';
import { Container } from 'react-bootstrap';
import { useLayoutContext } from '@/context/useLayoutContext';
import useViewPort from '@/hooks/useViewPort';


const Page = () => {
  const { width } = useViewPort();
  const {
  changeMenu: { size: changeMenuSize },
} = useLayoutContext();

  return (
    <header>
      <div className="topbar">
        <Container fluid>
          <div className="d-flex justify-content-between align-items-center">
            {/* Ícones alinhados à esquerda */}
            <div className="d-flex align-items-center gap-2">
  {/* Botão menu mobile */}
  {width <= 768 && (
    <button
      onClick={() => changeMenuSize('sm-hover-active')}
      className="btn btn-outline-light me-2"
      aria-label="Abrir menu"
    >
      <IconifyIcon icon="ri:menu-line" width={20} height={20} />
    </button>
  )}
  <ThemeCustomizerToggle />
</div>

            {/* Logout alinhado à direita */}
            <div className="ms-auto">
              <LogoutButton />
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
};

export default Page;
