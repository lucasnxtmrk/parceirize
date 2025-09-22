'use client';

import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNotificationContext } from '@/context/useNotificationContext';
import useQueryParams from '@/hooks/useQueryParams';

const useSignIn = () => {
  const [loading, setLoading] = useState(false);
  const { push } = useRouter();
  const { showNotification } = useNotificationContext();
  const queryParams = useQueryParams();

  const loginFormSchema = yup.object({
    email: yup.string().email('Digite um e-mail válido').required('Digite seu e-mail'),
    password: yup.string().required('Digite sua senha')
  });

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const login = handleSubmit(async (values) => {
    setLoading(true);

    try {
      // Primeiro: Validar credenciais na API específica de admin
      const adminResponse = await fetch('/api/auth/login-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      const adminData = await adminResponse.json();

      if (!adminData.success) {
        showNotification({
          message: adminData.message || 'E-mail ou senha incorretos',
          variant: 'danger'
        });
        return;
      }

      // Segundo: Se validação passou, fazer login com NextAuth
      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password
      });

      if (result?.ok) {
        const role = adminData.user.role;
        let redirectUrl = '/dashboard'; // default

        if (role === 'superadmin') {
          redirectUrl = '/superadmin/dashboard';
        } else if (role === 'provedor') {
          redirectUrl = '/dashboard';
        }

        push(queryParams['redirectTo'] ?? redirectUrl);
        showNotification({
          message: 'Login realizado com sucesso!',
          variant: 'success'
        });
      } else {
        showNotification({
          message: 'Erro no processo de autenticação',
          variant: 'danger'
        });
      }
    } catch (error) {
      showNotification({
        message: 'Erro ao fazer login',
        variant: 'danger'
      });
    } finally {
      setLoading(false);
    }
  });

  return { loading, login, control };
};

export default useSignIn;