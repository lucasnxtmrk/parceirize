"use client";
import { signOut, useSession } from "next-auth/react";
import { Button } from "react-bootstrap";

const LogoutButton = () => {
  const { data: session } = useSession();

  const handleLogout = () => {
    const userRole = session?.user?.role?.toLowerCase();
    let callbackUrl = '/auth/login'; // default unificado
    let tab = '';

    switch(userRole) {
      case 'cliente':
        tab = '?tab=cliente';
        break;
      case 'parceiro':
        tab = '?tab=parceiro';
        break;
      case 'provedor':
      case 'superadmin':
        callbackUrl = '/auth/login-admin';
        break;
    }

    signOut({ redirect: true, callbackUrl: callbackUrl + tab });
  };

  return (
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={handleLogout}
      style={{
        borderColor: '#cbd5e1', // Melhor contraste para border
        color: '#475569', // Gray-600 com melhor contraste
        backgroundColor: 'transparent',
        borderRadius: '8px',
        padding: '0.375rem 0.75rem',
        fontSize: '0.8125rem',
        fontWeight: '500'
      }}
    >
      Sair
    </Button>
  );
};

export default LogoutButton;
