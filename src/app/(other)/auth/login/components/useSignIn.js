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
            email: 'user@demo.com',
            password: '123456'
        }
    });

    const login = handleSubmit(async (values) => { // Agora handleSubmit está definido
        setLoading(true);

        const callbackUrl = searchParams.get('redirectTo') ?? window.location.origin + '/carteirinha';

        signIn('credentials', {
            email: values?.email,
            password: values?.password,
            redirect: false,
        }).then(res => {
            if (res?.ok) {
                push(callbackUrl);
            } else {
                // Lidar com erro
            }
        }).finally(() => setLoading(false));
    });

    return { loading, login, control };
};

export default useSignIn;