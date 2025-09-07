'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNotificationContext } from '@/context/useNotificationContext';

const useSignIn = () => {
    const [loading, setLoading] = useState(false);
    const { push } = useRouter();
    const { showNotification } = useNotificationContext();
    const searchParams = useSearchParams();

    const loginFormSchema = yup.object({
        email: yup.string().email('Please enter a valid email').required('Please enter your email'),
        password: yup.string().required('Please enter your password')
    });

    // *** Correção: Mova useForm para DENTRO da função useSignIn ***
    const { control, handleSubmit } = useForm({
        resolver: yupResolver(loginFormSchema),
        defaultValues: {
            email: 'cliente@protegenet.com.br',
            password: '12345678'
        }
    });

    const login = handleSubmit(async (values) => {
        setLoading(true);
    
        const res = await signIn('credentials', {
            email: values?.email,
            password: values?.password,
            redirect: false, // Mantemos falso para redirecionar manualmente
        });
    
        if (res?.ok) {
            // 🔥 Buscar sessão para pegar o role do usuário
            const response = await fetch('/api/auth/session');
            const session = await response.json();
            const role = session?.user?.role;
    
            let redirectUrl = '/';
            if (role === 'cliente') redirectUrl = '/carteirinha';
            if (role === 'parceiro') redirectUrl = '/painel';
            if (role === 'admin') redirectUrl = '/dashboard';
    
            push(redirectUrl); // Agora redireciona corretamente!
        } else {
            showNotification('Erro no login', 'error');
        }
    
        setLoading(false);
    });
    

    return { loading, login, control };
};

export default useSignIn;