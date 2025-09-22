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
  // Estados
  const [loadingCliente, setLoadingCliente] = useState(false);
  const [loadingParceiro, setLoadingParceiro] = useState(false);
  const [step, setStep] = useState(1); // 1 = CPF, 2 = Senha (para cliente)
  const [clienteData, setClienteData] = useState(null);

  const { push } = useRouter();
  const { showNotification } = useNotificationContext();
  const queryParams = useQueryParams();

  // ==========================================
  // CLIENTE - Schemas e Forms
  // ==========================================

  // Schema para validação do documento (primeira etapa)
  const documentoFormSchema = yup.object({
    documento: yup.string()
      .required('Digite seu CPF ou CNPJ')
      .min(14, 'Documento deve ter pelo menos 11 dígitos')
  });

  // Schema para validação da senha (segunda etapa)
  const passwordFormSchema = yup.object({
    password: yup.string().required('Digite sua senha')
  });

  // Form para documento
  const documentoForm = useForm({
    resolver: yupResolver(documentoFormSchema),
    defaultValues: { documento: '' }
  });

  // Form para senha
  const passwordForm = useForm({
    resolver: yupResolver(passwordFormSchema),
    defaultValues: { password: '' }
  });

  // ==========================================
  // PARCEIRO - Schema e Form
  // ==========================================

  const parceiroFormSchema = yup.object({
    email: yup.string().email('Digite um e-mail válido').required('Digite seu e-mail'),
    password: yup.string().required('Digite sua senha')
  });

  const parceiroForm = useForm({
    resolver: yupResolver(parceiroFormSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // ==========================================
  // FUNÇÕES UTILITÁRIAS
  // ==========================================

  // Máscaras dinâmicas para CPF e CNPJ
  const formatDocumento = (value) => {
    const documento = value.replace(/\D/g, '');

    // Aplica máscara progressiva baseada no tamanho atual
    if (documento.length <= 11) {
      // Formato CPF: 000.000.000-00
      return documento
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    } else {
      // Formato CNPJ: 00.000.000/0000-00
      return documento
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
        .replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
    }
  };

  // Detectar tipo de documento
  const detectarTipoDocumento = (value) => {
    const documento = value.replace(/\D/g, '');
    if (documento.length < 12) return 'CPF';
    return 'CNPJ';
  };

  // ==========================================
  // FUNÇÕES DO CLIENTE
  // ==========================================

  // Verificar documento (primeira etapa)
  const checkDocumento = documentoForm.handleSubmit(async (values) => {
    setLoadingCliente(true);
    try {
      const response = await fetch('/api/auth/check-documento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento: values.documento })
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
          message: data.message || 'Documento não encontrado',
          variant: 'danger'
        });
      }
    } catch (error) {
      showNotification({
        message: 'Erro ao verificar documento',
        variant: 'danger'
      });
    } finally {
      setLoadingCliente(false);
    }
  });

  // Login do cliente (segunda etapa)
  const loginCliente = passwordForm.handleSubmit(async (values) => {
    if (!clienteData) return;

    setLoadingCliente(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        cpf: clienteData.cpf_cnpj,
        password: values.password
      });

      if (result?.ok) {
        // Buscar sessão para validar que é realmente um cliente
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        const role = session?.user?.role?.toLowerCase();

        // VALIDAÇÃO: Apenas clientes podem fazer login na tab cliente
        if (role !== 'cliente') {
          await signOut({ redirect: false });
          showNotification({
            message: 'Erro: Credenciais não correspondem a uma conta de cliente.',
            variant: 'danger'
          });
          return;
        }

        push(queryParams['redirectTo'] ?? '/carteirinha');
        showNotification({
          message: `Bem-vindo, ${clienteData.nome}!`,
          variant: 'success'
        });
      } else {
        showNotification({
          message: result?.error || 'Senha incorreta',
          variant: 'danger'
        });
      }
    } catch (error) {
      showNotification({
        message: 'Erro ao fazer login',
        variant: 'danger'
      });
    } finally {
      setLoadingCliente(false);
    }
  });

  // Voltar para etapa do documento
  const goBack = () => {
    setStep(1);
    setClienteData(null);
    passwordForm.reset();
  };

  // ==========================================
  // FUNÇÕES DO PARCEIRO
  // ==========================================

  // Login do parceiro
  const loginParceiro = parceiroForm.handleSubmit(async (values) => {
    setLoadingParceiro(true);
    try {
      // Primeiro: Validar credenciais na API específica de parceiro
      const parceiroResponse = await fetch('/api/auth/login-parceiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      const parceiroData = await parceiroResponse.json();

      if (!parceiroData.success) {
        showNotification({
          message: parceiroData.message || 'E-mail ou senha incorretos',
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
        push(queryParams['redirectTo'] ?? '/painel');
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
      setLoadingParceiro(false);
    }
  });

  // ==========================================
  // RETORNO DO HOOK
  // ==========================================

  return {
    // Cliente
    loadingCliente,
    step,
    clienteData,
    documentoForm,
    passwordForm,
    checkDocumento,
    loginCliente,
    goBack,
    formatDocumento,
    detectarTipoDocumento,

    // Parceiro
    loadingParceiro,
    parceiroForm,
    loginParceiro
  };
};

export default useSignIn;