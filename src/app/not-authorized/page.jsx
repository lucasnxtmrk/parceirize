'use client';

import Link from 'next/link';
import { Button } from 'react-bootstrap';

export default function NotAuthorizedPage() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100vh', textAlign: 'center' }}>
      <h1 className="mb-3">🚫 Acesso não autorizado</h1>
      <p className="mb-4">Você não tem permissão para acessar essa página.</p>
      <Link href="/">
        <Button variant="primary">Voltar para a página inicial</Button>
      </Link>
    </div>
  );
}
