import IconifyIcon from '@/components/wrappers/IconifyIcon';
import LeftSideBarToggle from './components/LeftSideBarToggle';
import ProfileDropdown from './components/ProfileDropdown';
import ThemeCustomizerToggle from './components/ThemeCustomizerToggle';
import Notifications from './components/Notifications';
import ThemeModeToggle from './components/ThemeModeToggle';
import MaximizeScreen from './components/MaximizeScreen';
import LogoutButton from './components/LogoutButton';
import { Container } from 'react-bootstrap';
const page = () => {
  return <header>
      <div className="topbar">
        <Container fluid>
          <div className="navbar-header">
            <div className="d-flex align-items-center gap-1">
              <ThemeModeToggle />

              <ThemeCustomizerToggle />
              <LogoutButton />
            </div>
          </div>
        </Container>
      </div>
    </header>;
};
export default page;