'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import logoDark from '@/assets/images/logo-dark.png';
import logoLight from '@/assets/images/logo-light.png';
import logoSm from '@/assets/images/logo-sm.png';
import Image from 'next/image';
import Link from 'next/link';

const LogoBox = () => {
  const { data: session } = useSession();
  const [customLogo, setCustomLogo] = useState(null);

  useEffect(() => {
    if (session?.user?.role === 'provedor') {
      loadCustomLogo();
    }

    // Escutar eventos de atualização de logo
    const handleLogoUpdate = (event) => {
      if (event.detail?.logo_url) {
        setCustomLogo(event.detail.logo_url);
      }
    };

    window.addEventListener('logoUpdate', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('logoUpdate', handleLogoUpdate);
    };
  }, [session]);

  const loadCustomLogo = async () => {
    try {
      const response = await fetch('/api/admin/customizacao');
      if (response.ok) {
        const customization = await response.json();
        if (customization.logo_url && customization.customization_available) {
          setCustomLogo(customization.logo_url);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar logo personalizada:', error);
    }
  };

  return <div className="logo-box">
      <Link href="/" className="logo-dark">
        {customLogo ? (
          <>
            <img 
              src={customLogo}
              alt="Logo pequena personalizada"
              className="logo-sm"
              style={{ 
                width: '28px', 
                height: '28px', 
                objectFit: 'contain'
              }}
              onError={() => setCustomLogo(null)}
            />
            <img 
              src={customLogo}
              alt="Logo grande personalizada"
              className="logo-lg"
              style={{ 
                width: '118px', 
                height: '30px', 
                objectFit: 'contain'
              }}
              onError={() => setCustomLogo(null)}
            />
          </>
        ) : (
          <>
            <Image width={28} height={28} src={logoSm} className="logo-sm" alt="logo sm" />
            <Image width={118} height={30} src={logoDark} className="logo-lg" alt="logo dark" />
          </>
        )}
      </Link>
      <Link href="/" className="logo-light">
        {customLogo ? (
          <>
            <img 
              src={customLogo}
              alt="Logo pequena personalizada"
              className="logo-sm"
              style={{ 
                width: '28px', 
                height: '28px', 
                objectFit: 'contain'
              }}
              onError={() => setCustomLogo(null)}
            />
            <img 
              src={customLogo}
              alt="Logo grande personalizada"
              className="logo-lg"
              style={{ 
                width: '118px', 
                height: '30px', 
                objectFit: 'contain'
              }}
              onError={() => setCustomLogo(null)}
            />
          </>
        ) : (
          <>
            <Image width={28} height={28} src={logoSm} className="logo-sm" alt="logo sm" />
            <Image width={118} height={30} src={logoLight} className="logo-lg" alt="logo light" />
          </>
        )}
      </Link>
    </div>;
};
export default LogoBox;