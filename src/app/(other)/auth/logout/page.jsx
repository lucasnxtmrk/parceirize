'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Fallback para login-parceiro se chegou aqui diretamente
    router.push('/auth/login-parceiro');
  }, [router]);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Redirecionando...</span>
        </div>
        <p className="mt-2" style={{ color: "#64748b" }}>Redirecionando...</p>
      </div>
    </div>
  );
}