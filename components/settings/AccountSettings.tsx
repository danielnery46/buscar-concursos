import React, { useState, useEffect, memo, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useUserData } from '../../contexts/UserDataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AccessibilitySettings } from '../../types';
import {
    UserIcon, KeyIcon, AtSignIcon, CheckIcon, LogOutIcon, SaveIcon, AlertTriangleIcon, LocationIcon, FileJsonIcon
} from '../Icons';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface AccountSettingsProps {
    onSignOut: () => void;
}

const FormStatus: React.FC<{ type: 'success' | 'error'; message: string }> = memo(({ type, message }) => {
    const isSuccess = type === 'success';
    return (
        <div className={`p-3 mt-4 border rounded-lg text-sm flex items-center gap-2 ${
            isSuccess 
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300'
        }`}>
            {isSuccess ? <CheckIcon className="h-5 w-5"/> : <AlertTriangleIcon className="h-5 w-5"/>}
            {message}
        </div>
    );
});

export const AccountSettings: React.FC<AccountSettingsProps> = ({ onSignOut }) => {
    const { user, signOut } = useAuth();
    const { cidadeRota, setCidadeRota, exportUserData, importUserData } = useUserData();
    const { setAccessibilitySettings } = useSettings();

    // Estado para Dados Pessoais e CEP
    const [fullName, setFullName] = useState('');
    const [localCep, setLocalCep] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Estado para Alteração de Senha
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Estado para Exclusão de Conta
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
    const [deleteStatus, setDeleteStatus] = useState<{ type: 'error', message: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Estado para Importação/Exportação
    const importInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(false);
    const [fileToConfirm, setFileToConfirm] = useState<File | null>(null);

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || '');
            setLocalCep(cidadeRota || '');
        }
    }, [user, cidadeRota]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileStatus(null);

        const nameChanged = fullName !== (user?.user_metadata?.full_name || '');
        const cepChanged = localCep !== cidadeRota;
        const cepIsValid = localCep.replace(/\D/g, '').length === 8 || localCep === '';

        if (!cepChanged && !nameChanged) {
            setProfileLoading(false);
            return; // No changes to save
        }
    
        try {
            if (cepChanged) {
                if (!cepIsValid) {
                    throw new Error('Por favor, insira um CEP válido com 8 dígitos ou deixe o campo vazio.');
                }
                setCidadeRota(localCep);
            }
    
            if (nameChanged) {
                const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
                if (error) throw error;
            }
            
            let successMsg = 'Suas alterações foram salvas com sucesso!';
            if (nameChanged && cepChanged) {
                successMsg = 'Seu nome e CEP foram atualizados com sucesso!';
            } else if (nameChanged) {
                successMsg = 'Seu nome foi atualizado com sucesso!';
            } else if (cepChanged) {
                successMsg = 'Seu CEP foi atualizado com sucesso!';
            }
            setProfileStatus({ type: 'success', message: successMsg });
    
        } catch (error: any) {
            setProfileStatus({ type: 'error', message: `Erro ao atualizar perfil: ${error.message}` });
        } finally {
            setProfileLoading(false);
        }
    };

     const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordStatus(null);

        if (!currentPassword) {
            setPasswordStatus({ type: 'error', message: 'Por favor, insira sua senha atual.' });
            return;
        }
        if (newPassword.length < 6) {
             setPasswordStatus({ type: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
             return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordStatus({ type: 'error', message: 'As senhas não coincidem.' });
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordStatus({ type: 'error', message: 'A nova senha deve ser diferente da senha atual.' });
            return;
        }

        setPasswordLoading(true);

        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: user!.email!,
            password: currentPassword,
        });

        if (verifyError) {
            setPasswordStatus({ type: 'error', message: 'A senha atual está incorreta.' });
            setPasswordLoading(false);
            return;
        }
        
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        setPasswordLoading(false);
        if (error) {
            setPasswordStatus({ type: 'error', message: `Erro ao alterar senha: ${error.message}` });
        } else {
            setPasswordStatus({ type: 'success', message: 'Senha alterada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        setDeleteStatus(null);
        try {
            const { error } = await supabase.functions.invoke('delete-user');
            if (error) {
                throw new Error(error.message);
            }
            await signOut();
        } catch (error) {
            setDeleteStatus({ type: 'error', message: `Erro ao apagar conta: ${error instanceof Error ? error.message : 'Tente novamente mais tarde.'}` });
            setIsDeleting(false);
        }
        setDeleteConfirmationText('');
        setIsConfirmingDelete(false);
    };

    const handleCepInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
        setLocalCep(value);
    };

    const onImportClick = () => { importInputRef.current?.click(); };
    const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImportError(null);
            setImportSuccess(false);
            setFileToConfirm(file);
        }
        event.target.value = '';
    };

    const onConfirmImport = async () => {
        if (fileToConfirm) {
            try {
                const importedSettings = await importUserData(fileToConfirm);
                if (importedSettings) {
                    setAccessibilitySettings(importedSettings as AccessibilitySettings);
                }
                setImportSuccess(true);
                setTimeout(() => setImportSuccess(false), 5000);
            } catch (error) {
                setImportError(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
            } finally {
                setFileToConfirm(null);
            }
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-col space-y-1.5">
                    <CardTitle>Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        {/* Nome Completo */}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome Completo</label>
                            <Input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} icon={<UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />} placeholder="Seu nome completo" />
                        </div>
                        {/* E-mail */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><AtSignIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" /></div>
                                <input type="email" id="email" value={user?.email || ''} readOnly className="w-full text-base pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 rounded-lg shadow-sm focus:outline-none transition-colors cursor-not-allowed" aria-label="E-mail (não pode ser alterado)" />
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-justify hyphens-auto">Para alterar seu e-mail, exporte seus dados, apague a conta atual e crie uma nova.</p>
                        </div>
                        {/* CEP */}
                        <div>
                            <label htmlFor="cep" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">CEP de Partida</label>
                            <Input id="cep" type="text" value={localCep} onChange={handleCepInputChange} icon={<LocationIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />} placeholder="00000-000" maxLength={9}/>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-justify hyphens-auto">Seu CEP é usado para calcular rotas e será salvo em sua conta.</p>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={profileLoading}>
                                {profileLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <SaveIcon className="h-5 w-5" />}
                                <span className="ml-2">Salvar Alterações</span>
                            </Button>
                        </div>
                        {profileStatus && <FormStatus type={profileStatus.type} message={profileStatus.message} />}
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col space-y-1.5"><CardTitle>Alterar Senha</CardTitle></CardHeader>
                 <CardContent className="pt-0">
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        <div>
                            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Senha Atual</label>
                            <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} icon={<KeyIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />} placeholder="••••••••" autoComplete="current-password" required />
                        </div>
                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nova Senha</label>
                            <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} icon={<KeyIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />} placeholder="Pelo menos 6 caracteres" autoComplete="new-password" required />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirmar Nova Senha</label>
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} icon={<KeyIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />} placeholder="Repita a nova senha" autoComplete="new-password" required />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={passwordLoading}>
                                {passwordLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <SaveIcon className="h-5 w-5" />}
                                <span className="ml-2">Alterar Senha</span>
                            </Button>
                        </div>
                        {passwordStatus && <FormStatus type={passwordStatus.type} message={passwordStatus.message} />}
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-col space-y-1.5"><CardTitle>Backup de Dados da Conta</CardTitle></CardHeader>
                <CardContent className="pt-0">
                     <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify hyphens-auto">Exporte um arquivo de backup com os dados da sua conta (favoritos, CEP e configurações) ou importe um arquivo para restaurar suas preferências.</p>
                    {importError && ( <div className="p-3 mb-3 border border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-start gap-2"> <AlertTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" /> <div><strong>Erro:</strong> {importError}</div> </div> )}
                    {importSuccess && ( <div className="p-3 mb-3 border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-300"> <strong>Sucesso!</strong> Seus dados foram importados. </div> )}
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="secondary" onClick={exportUserData}><FileJsonIcon className="h-5 w-5" /><span className="ml-2">Exportar</span></Button>
                        <Button variant="secondary" onClick={onImportClick}><FileJsonIcon className="h-5 w-5" /><span className="ml-2">Importar</span></Button>
                        <input ref={importInputRef} type="file" accept=".json" onChange={onFileSelected} className="hidden" />
                    </div>
                     {fileToConfirm && (
                        <div className="mt-4 p-3 border-2 border-dashed border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <p className="text-sm text-amber-900 dark:text-amber-200 text-justify hyphens-auto">Importar o arquivo <strong>{fileToConfirm.name}</strong> irá sobrescrever os dados da sua conta. Deseja continuar?</p>
                            <div className="mt-3 flex gap-3">
                                <Button onClick={onConfirmImport} className="flex-1 bg-amber-500 hover:bg-amber-600">Sim, importar</Button>
                                <Button variant="secondary" onClick={() => setFileToConfirm(null)} className="flex-1">Cancelar</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Sair da sua conta</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-justify hyphens-auto">Encerra a sua sessão de login neste dispositivo.</p>
                        </div>
                        <Button variant="secondary" onClick={onSignOut} className="w-full sm:w-auto flex-shrink-0">
                            <LogOutIcon className="h-5 w-5" />
                            <span className="ml-2">Sair</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50 shadow-sm p-6">
                <h2 className="text-xl font-bold text-red-800 dark:text-red-200">Zona de Perigo</h2>
                <div className="mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Apagar Conta</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl text-justify hyphens-auto">Esta ação é irreversível. Todos os seus dados, incluindo buscas salvas e configurações, serão apagados permanentemente.</p>
                        </div>
                        {!isConfirmingDelete ? (
                        <Button variant="destructive" onClick={() => setIsConfirmingDelete(true)} disabled={isDeleting} className="w-full sm:w-auto flex-shrink-0">
                            {isDeleting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <AlertTriangleIcon className="h-5 w-5" />}
                            <span className="ml-2">Apagar minha conta</span>
                        </Button>
                        ) : null}
                    </div>
                    {isConfirmingDelete && (
                    <div className="mt-4 pt-4 border-t-2 border-red-200 dark:border-red-700/80 space-y-4">
                        <div>
                            <h4 className="font-semibold text-red-800 dark:text-red-200">Confirmar exclusão da conta</h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1 text-justify hyphens-auto">Para confirmar, por favor digite seu e-mail (<span className="font-mono text-xs select-all">{user?.email}</span>) no campo abaixo.</p>
                        </div>
                        <div>
                            <label htmlFor="delete-confirm" className="sr-only">Digite seu e-mail para confirmar</label>
                            <Input id="delete-confirm" type="email" value={deleteConfirmationText} onChange={e => setDeleteConfirmationText(e.target.value)} icon={<AtSignIcon className="h-5 w-5 text-red-400 dark:text-red-500" />} placeholder="Digite seu e-mail para confirmar" />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => { setIsConfirmingDelete(false); setDeleteConfirmationText(''); }} className="flex-1">Cancelar</Button>
                            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting || deleteConfirmationText !== user?.email} className="flex-1">{isDeleting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Apagar permanentemente'}</Button>
                        </div>
                    </div>
                    )}
                    {deleteStatus && <FormStatus type={deleteStatus.type} message={deleteStatus.message} />}
                </div>
            </div>
        </div>
    );
};