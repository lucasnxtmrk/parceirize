"use client";
import { signOut } from "next-auth/react";
import { Button } from "react-bootstrap";

const LogoutButton = () => {
  return (
    <Button 
      variant="outline-secondary" 
      size="sm"
      onClick={() => signOut({ redirect: true, callbackUrl: "/auth/login" })}
      style={{
        borderColor: '#e2e8f0',
        color: '#64748b',
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
