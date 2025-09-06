'use client';

import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { findAllParent, findMenuItem, getMenuItemFromURL } from '@/helpers/Manu2';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { Collapse } from 'react-bootstrap';
const MenuItemWithChildren = memo(({
  item,
  className,
  linkClassName,
  subMenuClassName,
  activeMenuItems,
  toggleMenu
}) => {
  const [open, setOpen] = useState(activeMenuItems.includes(item.key));
  useEffect(() => {
    setOpen(activeMenuItems.includes(item.key));
  }, [activeMenuItems, item]);
  const toggleMenuItem = e => {
    e.preventDefault();
    const status = !open;
    setOpen(status);
    if (toggleMenu) toggleMenu(item, status);
    return false;
  };
  const getActiveClass = useCallback(item => {
    return activeMenuItems?.includes(item.key) ? 'active' : '';
  }, [activeMenuItems]);
  return (
    <li className={className}>
      <div onClick={toggleMenuItem} aria-expanded={open} role="button" className={clsx(linkClassName)}>
        {item.icon && <span className="nav-icon">
            {' '}
            <IconifyIcon icon={item.icon} />{' '}
          </span>}
        <span className="nav-text">{item.label}</span>
        {!item.badge ? <IconifyIcon icon="bx:chevron-down" className="menu-arrow ms-auto" /> : <span className={`badge badge-pill text-end bg-${item.badge.variant}`}>{item.badge.text}</span>}
      </div>
      <Collapse in={open}>
        <div>
          <ul className={clsx(subMenuClassName)}>
            {(item.children || []).map((child, idx) => {
            return <Fragment key={child.key + idx}>
                  {child.children ? <MenuItemWithChildren item={child} linkClassName={clsx('nav-link', getActiveClass(child))} activeMenuItems={activeMenuItems} className="sub-nav-item" subMenuClassName="nav sub-navbar-nav" toggleMenu={toggleMenu} /> : <MenuItem item={child} className="sub-nav-item" linkClassName={clsx('sub-nav-link', getActiveClass(child))} />}
                </Fragment>
          })}
          </ul>
        </div>
      </Collapse>
    </li>
  );
});

MenuItemWithChildren.displayName = 'MenuItemWithChildren';

const MenuItem = memo(({
  item,
  className,
  linkClassName
}) => {
  return (
    <li className={className}>
      <MenuItemLink item={item} className={linkClassName} />
    </li>
  );
});

MenuItem.displayName = 'MenuItem';

const MenuItemLink = memo(({
  item,
  className
}) => {
  return (
    <Link href={item.url ?? ''} target={item.target} className={clsx(className, {
      disabled: item.isDisabled
    })}>
      {item.icon && <span className="nav-icon">
          <IconifyIcon icon={item.icon} />
        </span>}
      <span className="nav-text">{item.label}</span>
      {item.badge && <span className={`badge badge-pill text-end bg-${item.badge.variant}`}>{item.badge.text}</span>}
    </Link>
  );
});

MenuItemLink.displayName = 'MenuItemLink';

const AppMenu = ({
  menuItems
}) => {
  const pathname = usePathname();
  const [activeMenuItems, setActiveMenuItems] = useState([]);
  const toggleMenu = (menuItem, show) => {
    if (show) setActiveMenuItems([menuItem.key, ...findAllParent(menuItems, menuItem)]);
  };
  const getActiveClass = useCallback(item => {
    return activeMenuItems?.includes(item.key) ? 'active' : '';
  }, [activeMenuItems]);
  // Memoize matching menu item calculation
  const matchingMenuItem = useMemo(() => {
    const trimmedURL = pathname?.replaceAll('', '');
    return getMenuItemFromURL(menuItems, trimmedURL);
  }, [pathname, menuItems]);

  // Memoize active menu items calculation
  const calculatedActiveMenuItems = useMemo(() => {
    if (matchingMenuItem) {
      const activeMt = findMenuItem(menuItems, matchingMenuItem.key);
      if (activeMt) {
        return [activeMt.key, ...findAllParent(menuItems, activeMt)];
      }
    }
    return [];
  }, [matchingMenuItem, menuItems]);

  // Optimized scroll function with debouncing
  const scrollToActiveItem = useCallback(() => {
    if (!matchingMenuItem) return;
    
    const trimmedURL = pathname?.replaceAll('', '');
    // Use requestAnimationFrame instead of setTimeout for better performance
    requestAnimationFrame(() => {
      const activatedItem = document.querySelector(`#leftside-menu-container .simplebar-content a[href="${trimmedURL}"]`);
      if (activatedItem) {
        const simplebarContent = document.querySelector('#leftside-menu-container .simplebar-content-wrapper');
        if (simplebarContent) {
          const offset = activatedItem.offsetTop - window.innerHeight * 0.4;
          // Use smooth scroll instead of custom animation for better performance
          simplebarContent.scrollTo({
            top: offset,
            behavior: 'smooth'
          });
        }
      }
    });
  }, [pathname, matchingMenuItem]);
  // Update active menu items when calculation changes
  useEffect(() => {
    setActiveMenuItems(calculatedActiveMenuItems);
  }, [calculatedActiveMenuItems]);

  // Handle scroll to active item with debouncing
  useEffect(() => {
    if (menuItems && menuItems.length > 0 && matchingMenuItem) {
      const timeoutId = setTimeout(scrollToActiveItem, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [menuItems, matchingMenuItem, scrollToActiveItem]);
  return (
    <ul className="navbar-nav" id="navbar-nav">
      {(menuItems || []).map((item, idx) => {
      return <Fragment key={item.key + idx}>
            {item.isTitle ? <li className={clsx('menu-title')}>{item.label}</li> : <>
                {item.children ? <MenuItemWithChildren item={item} toggleMenu={toggleMenu} className="nav-item" linkClassName={clsx('nav-link menu-arrow', getActiveClass(item))} subMenuClassName="nav sub-navbar-nav" activeMenuItems={activeMenuItems} /> : <MenuItem item={item} linkClassName={clsx('nav-link', getActiveClass(item))} className="nav-item" />}
              </>}
          </Fragment>;
    })}
    </ul>
  );
};
export default memo(AppMenu);