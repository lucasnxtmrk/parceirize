'use client';

import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useLayoutContext } from '@/context/useLayoutContext';
import useViewPort from '@/hooks/useViewPort';
import { useEffect } from 'react';

const HoverMenuToggle = () => {
  const {
    menu: { size },
    changeMenu: { size: changeMenuSize },
  } = useLayoutContext();

  const { width } = useViewPort();

  useEffect(() => {
    if (width <= 1140 && size !== 'hidden') {
      changeMenuSize('hidden');
    }
  }, [width]);

  const handleToggle = () => {
    if (width <= 768) {
      // No mobile: alterna entre abrir e fechar de verdade
      if (size === 'sm-hover-active') {
        changeMenuSize('hidden');
      } else {
        changeMenuSize('sm-hover-active');
      }
    } else {
      // No desktop: alterna sm-hover <-> sm-hover-active
      if (size === 'sm-hover-active') {
        changeMenuSize('sm-hover');
      } else {
        changeMenuSize('sm-hover-active');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="button-sm-hover"
      aria-label="Show/Hide Sidebar"
    >
      <IconifyIcon height={24} width={24} icon="ri:menu-2-line" className="button-sm-hover-icon" />
    </button>
  );
};

export default HoverMenuToggle;
