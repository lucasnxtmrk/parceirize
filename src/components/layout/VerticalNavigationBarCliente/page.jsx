import LogoBox from '@/components/LogoBox';
import React, { useMemo } from 'react';
import HoverMenuToggle from './components/HoverMenuToggle';
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient';
import AppMenu from './components/AppMenu';
import { getMenuItems } from '@/helpers/Manu2';
const VerticalNavigationBarCliente = () => {
  const menuItems = useMemo(() => getMenuItems(), []);
  return <div className="main-nav" id='leftside-menu-container'>
      <LogoBox />
      <HoverMenuToggle />
      <SimplebarReactClient className="scrollbar" data-simplebar>
        <AppMenu menuItems={menuItems} />
      </SimplebarReactClient>
    </div>;
};
export default React.memo(VerticalNavigationBarCliente);