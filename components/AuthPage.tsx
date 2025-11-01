import React, { useState, useEffect, memo } from 'react';
import { supabase } from '../utils/supabase';
import { AlertTriangleIcon, AtSignIcon, UserIcon, KeyIcon, GitHubIcon, GoogleIcon, FacebookIcon, DiscordIcon, CheckIcon } from './Icons';
import type { AuthApiError, Provider } from '@supabase/supabase-js';
import type { AuthView } from '../types';
import { Button } from './ui/Button';

export type { AuthView };

const mapAuthError = (err: AuthApiError): string => {
    const message = err.message.toLowerCase();
    if (message.includes('email not confirmed')) {
        return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada para o código de verificação.';
    }
    if (message.includes('invalid login credentials')) {
        return 'E-mail ou senha inválidos. Por favor, verifique seus dados e tente novamente.';
    }
    if (message.includes('user already registered')) {
        return 'Este e-mail já está cadastrado. Tente fazer login ou use a opção "Esqueceu sua senha?".';
    }
    if (message.includes('password should be at least 6 characters')) {
        return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (message.includes('unable to validate email address')) {
        return 'O formato do e-mail parece inválido. Verifique e tente novamente.';
    }
    return 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';
};


// =================================================================================
// Sub-componentes para melhor organização
// =================================================================================

const FormStatus: React.FC<{ type: 'success' | 'error'; message: React.ReactNode }> = memo(({ type, message }) => {
    const config = {
        success: {
            icon: <CheckIcon className="h-5 w-5" />,
            classes: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
        },
        error: {
            icon: <AlertTriangleIcon className="h-5 w-5" />,
            classes: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300',
        }
    };
    const currentConfig = config[type];
    return (
        <div className={`p-3 my-4 border rounded-lg text-sm flex items-start gap-2 ${currentConfig.classes}`}>
            <div className="flex-shrink-0 mt-0.5">{currentConfig.icon}</div>
            <div>{message}</div>
        </div>
    );
});

const oauthProviders = [
    { provider: 'google' as const, label: 'Google', icon: <GoogleIcon className="h-6 w-6" />, colorClass: '' },
    { provider: 'github' as const, label: 'GitHub', icon: <GitHubIcon className="h-6 w-6" />, colorClass: '' },
    { provider: 'facebook' as const, label: 'Facebook', icon: <FacebookIcon className="h-6 w-6" />, colorClass: 'text-blue-600' },
    { provider: 'discord' as const, label: 'Discord', icon: <DiscordIcon className="h-7 w-7" />, colorClass: 'text-[#5865F2]' },
];

const OAuthProviders: React.FC<{ onSelectProvider: (provider: Provider) => void; loading: boolean }> = memo(({ onSelectProvider, loading }) => (
    <div className="flex justify-center gap-4">
        {oauthProviders.map(({ provider, label, icon, colorClass }) => (
            <button
                key={provider}
                type="button"
                onClick={() => onSelectProvider(provider)}
                disabled={loading}
                aria-label={`Continuar com ${label}`}
                className={`inline-flex justify-center items-center w-12 h-12 border border-gray-300 dark:border-gray-700 rounded-full shadow-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 transition-colors disabled:opacity-50 ${colorClass}`}
            >
                {icon}
            </button>
        ))}
    </div>
));

const AuthLayout: React.FC<{ children: React.ReactNode }> = memo(({ children }) => (
    <div className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg">
            {children}
        </div>
    </div>
));

// =================================================================================
// Componente Principal
// =================================================================================

interface AuthPageProps {
  view: AuthView;
  onViewChange: (view: AuthView) => void;
  initialEmail?: string;
}

const AuthPage: React.FC<AuthPageProps> = ({ view, onViewChange, initialEmail = '' }) => {
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    const [authSubView, setAuthSubView] = useState<'form' | 'otp_signup' | 'otp_recovery'>('form');
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        setEmail(initialEmail);
    }, [initialEmail]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timerId = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
            return () => clearInterval(timerId);
        }
    }, [resendCooldown]);

    const startResendCooldown = () => setResendCooldown(60);

    const clearState = (newView: AuthView, preserveMessage = false) => {
        onViewChange(newView);
        if (!preserveMessage) {
            setError(null);
            setSuccessMessage(null);
        }
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
        setAuthSubView('form');
    };
    
    // --- Handlers de Ações de Autenticação ---

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (view === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else { // signup
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setAuthSubView('otp_signup');
                startResendCooldown();
            }
        } catch (e) {
            const err = e as AuthApiError;
            const userFriendlyError = mapAuthError(err);
            setError(userFriendlyError);
            if (err.message.includes('Email not confirmed')) {
                setAuthSubView('otp_signup');
                startResendCooldown();
            }
            console.error('Authentication error:', err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleOAuthLogin = async (provider: Provider) => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({ provider });
        if (error) {
            setError(`Erro ao fazer login com ${provider}: ${error.message}`);
            setLoading(false);
        }
    };
    
    const handleOtpVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        const { data: { session }, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
        setLoading(false);
        if (error || !session) setError("Código inválido ou expirado. Verifique o código ou solicite um novo.");
    };

    const handleResend = async (type: 'signup' | 'recovery') => {
        if (!email) {
            setError(`Por favor, digite seu e-mail para reenviarmos ${type === 'signup' ? 'a confirmação' : 'o código'}.`);
            return;
        }
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (type === 'recovery') {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            setLoading(false);
            if (error) {
                // Log for debugging but don't show to user to prevent email enumeration
                console.error("Erro na solicitação de reenvio de senha:", error.message);
            }
            // Always show a success message
            setSuccessMessage(`Um novo código foi enviado para ${email}.`);
            startResendCooldown();
        } else {
            // 'signup' is a valid type for resend
            const { error } = await supabase.auth.resend({ type: 'signup', email });
            setLoading(false);
            if (error) {
                setError('Ocorreu um erro ao reenviar. Por favor, tente novamente mais tarde.');
            } else {
                setSuccessMessage(`Um novo código foi enviado para ${email}.`);
                startResendCooldown();
            }
        }
    };

    const handleRequestPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        const genericSuccessMessage = 'Se um usuário com este e-mail existir, um código para redefinição de senha será enviado.';
        
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            // O erro é logado no console para depuração, mas não exibido ao usuário.
            if (error) {
                console.error("Erro na solicitação de redefinição de senha:", error.message);
            }
        } catch (e) {
            console.error("Erro inesperado durante a redefinição de senha:", e);
        } finally {
            // Exibe sempre a mensagem de sucesso para evitar a enumeração de e-mails.
            setSuccessMessage(genericSuccessMessage);
            setAuthSubView('otp_recovery');
            startResendCooldown();
            setLoading(false);
        }
    };
    
    const handleUpdatePasswordWithOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (newPassword.length < 6) return setError('A nova senha deve ter no mínimo 6 caracteres.');
        if (newPassword !== confirmPassword) return setError('As senhas não coincidem.');
        
        setLoading(true);
        const { data: { session }, error: otpError } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
        if (otpError || !session) {
            setError('Código inválido ou expirado. Tente reenviar.');
            setLoading(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        setLoading(false);
        if (updateError) {
            setError(`Erro ao redefinir senha: ${updateError.message}`);
        } else {
            setSuccessMessage('Senha redefinida com sucesso! Você já pode fazer login.');
            clearState('login', true);
        }
    };

    // --- Renderização ---

    if (view === 'login' || view === 'signup') {
        if (authSubView === 'otp_signup') {
            return (
                <AuthLayout>
                    <div className="text-center mb-6">
                        <CheckIcon className="mx-auto h-12 w-12 text-indigo-500"/>
                        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Verifique seu E-mail</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enviamos um código de 6 dígitos para <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>.</p>
                    </div>
                    {error && <FormStatus type="error" message={error} />}
                    {successMessage && <FormStatus type="success" message={successMessage} />}
                    <form onSubmit={handleOtpVerification} className="space-y-6">
                        <div>
                            <label htmlFor="otp" className="sr-only">Código de 6 dígitos</label>
                            <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="123456" />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Confirmar Conta'}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <p>Não recebeu o código? <button onClick={() => handleResend('signup')} disabled={loading || resendCooldown > 0} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1 focus:outline-none focus:underline disabled:text-gray-400 dark:disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed">{resendCooldown > 0 ? `Aguarde ${resendCooldown}s` : 'Reenviar'}</button></p>
                        <p>Digitou o e-mail errado? <button onClick={() => setAuthSubView('form')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1 focus:outline-none focus:underline">Voltar</button></p>
                    </div>
                </AuthLayout>
            );
        }

        return (
            <AuthLayout>
                <div className="text-center mb-6">
                    <UserIcon className="mx-auto h-12 w-12 text-indigo-500"/>
                    <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{view === 'login' ? 'Acessar sua conta' : 'Criar uma conta'}</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{view === 'login' ? 'Bem-vindo(a) de volta!' : 'Salve suas buscas e configurações.'}</p>
                </div>
                {error && <FormStatus type="error" message={error} />}
                {successMessage && <FormStatus type="success" message={successMessage} />}
                <form onSubmit={handleAuthAction} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
                        <div className="mt-1 relative">
                            <AtSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"/>
                            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="voce@email.com"/>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                            {view === 'login' && <div className="text-sm"><button type="button" onClick={() => clearState('forgot_password')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:underline">Esqueceu sua senha?</button></div>}
                        </div>
                        <div className="mt-1 relative">
                            <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"/>
                            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="••••••••" />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : view === 'login' ? 'Entrar' : 'Cadastrar'}
                    </Button>
                </form>
                <div className="relative my-6"><div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300 dark:border-gray-700" /></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Ou continue com</span></div></div>
                <OAuthProviders onSelectProvider={handleOAuthLogin} loading={loading} />
                <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">{view === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'} <button onClick={() => clearState(view === 'login' ? 'signup' : 'login')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1">{view === 'login' ? 'Cadastre-se' : 'Faça login'}</button></p>
            </AuthLayout>
        );
    }
    
    if (view === 'forgot_password') {
        return (
            <AuthLayout>
                <div className="text-center mb-6">
                    <KeyIcon className="mx-auto h-12 w-12 text-indigo-500"/>
                    <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{authSubView === 'otp_recovery' ? 'Verifique seu E-mail' : 'Redefinir Senha'}</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{authSubView === 'otp_recovery' ? <>Enviamos um código para <span className="font-semibold">{email}</span>. Insira-o abaixo com sua nova senha.</> : 'Enviaremos um código de verificação para o seu e-mail.'}</p>
                    {authSubView === 'otp_recovery' && <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">Se o e-mail estiver correto e cadastrado, você receberá o código em alguns instantes.</p>}
                </div>
                {error && <FormStatus type="error" message={error} />}
                {successMessage && <FormStatus type="success" message={successMessage} />}
                
                {authSubView === 'form' ? (
                    <form onSubmit={handleRequestPasswordReset} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
                            <div className="mt-1 relative">
                                <AtSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"/>
                                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="voce@email.com"/>
                            </div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full">{loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Enviar Código'}</Button>
                    </form>
                ) : (
                    <form onSubmit={handleUpdatePasswordWithOtp} className="space-y-4">
                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código de Verificação</label>
                            <input id="otp" type="text" inputMode="numeric" required value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="mt-1 w-full text-center text-xl font-mono tracking-[0.3em] py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="123456"/>
                        </div>
                        <div>
                            <label htmlFor="newPassword"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nova Senha</label>
                            <div className="mt-1 relative"><KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"/><input id="newPassword" type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="••••••••"/></div>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nova Senha</label>
                            <div className="mt-1 relative"><KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"/><input id="confirmPassword" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" placeholder="••••••••"/></div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full">{loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Redefinir Senha'}</Button>
                        <div className="text-center text-sm text-gray-600 dark:text-gray-400">Não recebeu? <button type="button" onClick={() => handleResend('recovery')} disabled={loading || resendCooldown > 0} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1 focus:outline-none focus:underline disabled:text-gray-400 dark:disabled:text-gray-500 disabled:no-underline disabled:cursor-not-allowed">{resendCooldown > 0 ? `Aguarde ${resendCooldown}s` : 'Reenviar código'}</button></div>
                    </form>
                )}
                <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">Lembrou sua senha? <button onClick={() => clearState('login')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1">Faça login</button></p>
            </AuthLayout>
        );
    }
    
    return null;
};

export default AuthPage;
