import IconifyIcon from '@/components/wrappers/IconifyIcon';
import LeftSideBarToggle from './components/LeftSideBarToggle';
import ProfileDropdown from './components/ProfileDropdown';
import ThemeCustomizerToggle from './components/ThemeCustomizerToggle';
import Notifications from './components/Notifications';
import ThemeModeToggle from './components/ThemeModeToggle';
import MaximizeScreen from './components/MaximizeScreen';
import LogoutButton from './components/LogoutButton';
import { Container } from 'react-bootstrap';

const Page = () => {
  return (
    <header>
      <div className="topbar">
        <Container fluid>
          <div className="d-flex justify-content-between align-items-center">
            {/* Ícones alinhados à esquerda */}
            <div className="d-flex align-items-center gap-2">
              <ThemeModeToggle />
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
