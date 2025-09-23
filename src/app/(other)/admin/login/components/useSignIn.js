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
      // Login específico para provedores via NextAuth
      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password
      });

      if (result?.ok) {
        // Redirecionamento específico para provedores
        push(queryParams['redirectTo'] ?? '/dashboard');
        showNotification({
          message: 'Login realizado com sucesso!',
          variant: 'success'
        });
      } else {
        let errorMessage = 'E-mail ou senha incorretos';

        if (result?.error) {
          if (result.error.includes('tenant')) {
            errorMessage = 'Este usuário não pode acessar este domínio';
          } else if (result.error.includes('role')) {
            errorMessage = 'Acesso restrito a provedores';
          }
        }

        showNotification({
          message: errorMessage,
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