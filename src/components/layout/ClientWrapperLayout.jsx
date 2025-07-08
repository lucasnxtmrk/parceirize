'use client';

import { useLayoutContext } from '@/context/useLayoutContext';

const ClientWrapperLayout = ({ children }) => {
  const {
    menu: { size },
    changeMenu: { size: changeMenuSize },
  } = useLayoutContext();

  return (
    <>
      {/* Backdrop que cobre tudo no mobile quando o menu está ativo */}
      {size === 'sm-hover-active' && (
        <div
          className="menu-backdrop"
          onClick={() => changeMenuSize('hidden')}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 1040,
          }}
        />
      )}
      {children}
    </>
  );
};

export default ClientWrapperLayout;
