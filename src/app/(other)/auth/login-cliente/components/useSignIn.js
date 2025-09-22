'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNotificationContext } from '@/context/useNotificationContext';
import useQueryParams from '@/hooks/useQueryParams';

const useSignIn = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = CPF, 2 = Senha
  const [clienteData, setClienteData] = useState(null);
  const { push } = useRouter();
  const { showNotification } = useNotificationContext();
  const queryParams = useQueryParams();

  // Schema para validação do CPF (primeira etapa)
  const cpfFormSchema = yup.object({
    cpf: yup.string()
      .required('Digite seu CPF')
      .min(14, 'CPF deve ter 11 dígitos')
  });

  // Schema para validação da senha (segunda etapa)
  const passwordFormSchema = yup.object({
    password: yup.string().required('Digite sua senha')
  });

  // Form para CPF
  const cpfForm = useForm({
    resolver: yupResolver(cpfFormSchema),
    defaultValues: { cpf: '' }
  });

  // Form para senha
  const passwordForm = useForm({
    resolver: yupResolver(passwordFormSchema),
    defaultValues: { password: '' }
  });

  // Máscara do CPF
  const formatCPF = (value) => {
    const cpf = value.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Verificar CPF
  const checkCPF = cpfForm.handleSubmit(async (values) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/check-cpf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: values.cpf })
      });

      const data = await response.json();

      if (data.exists) {
        setClienteData(data.cliente);
        setStep(2);
        showNotification({
          message: `Olá, ${data.cliente.nome}! Digite sua senha.`,
          variant: 'success'
        });
      } else {
        showNotification({
          message: data.message || 'CPF não encontrado',
          variant: 'danger'
        });
      }
    } catch (error) {
      showNotification({
        message: 'Erro ao verificar CPF',
        variant: 'danger'
      });
    }
    setLoading(false);
  });

  // Login com senha
  const login = passwordForm.handleSubmit(async (values) => {
    setLoading(true);

    // Usar CPF do cliente para autenticação
    const cpfLimpo = cpfForm.getValues('cpf').replace(/\D/g, '');
    const result = await signIn('credentials', {
      redirect: false,
      cpf: cpfLimpo,
      password: values.password
    });

    if (result?.ok) {
      push(queryParams['redirectTo'] ?? '/carteirinha');
      showNotification({
        message: 'Login realizado com sucesso!',
        variant: 'success'
      });
    } else {
      showNotification({
        message: result?.error ?? 'Senha incorreta',
        variant: 'danger'
      });
    }
    setLoading(false);
  });

  // Voltar para etapa do CPF
  const goBack = () => {
    setStep(1);
    setClienteData(null);
    passwordForm.reset();
  };

  return {
    loading,
    step,
    clienteData,
    cpfForm,
    passwordForm,
    checkCPF,
    login,
    goBack,
    formatCPF
  };
};

export default useSignIn;