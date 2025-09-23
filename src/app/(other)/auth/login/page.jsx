import React from 'react';
import { headers } from 'next/headers';
import SignIn from './components/SignIn';
import AdminSignIn from '../login-admin/components/SignIn';

export const metadata = {
  title: 'Login - Parceirize'
};

// Função para detectar domínio de admin
function isAdminDomain(hostname) {
  const adminDomains = [
    'admin.localhost',
    'admin.localhost:3000',
    'admin.parceirize.com.br',
    'admin.parceirize.com'
  ];
  return adminDomains.includes(hostname.toLowerCase());
}

const SignInPage = () => {
  // Detectar domínio no servidor (sem hydration issues)
  const headersList = headers();
  const hostname = headersList.get('host') || '';
  const isAdmin = isAdminDomain(hostname);

  console.log(`🌐 Server-side detectado - Hostname: ${hostname}, É admin: ${isAdmin}`);

  // Renderizar componente correto baseado no domínio
  if (isAdmin) {
    return <AdminSignIn />;
  } else {
    return <SignIn />;
  }
};

export default SignInPage;