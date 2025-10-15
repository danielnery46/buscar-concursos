import React, { useState, useRef, memo, useEffect } from 'react';
import { useUserData } from '../../contexts/UserDataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { AccessibilitySettings } from '../../types';
import { LocationIcon, AlertTriangleIcon, FileJsonIcon } from '../Icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// FIX: Renamed component to DataSettings and exported it.
export const DataSettings: React.FC = memo(() => {
    const { cidadeRota, setCidadeRota, exportUserData, importUserData, clearAllLocalData } = useUserData();
    const { setAccessibilitySettings } = useSettings();
    const [localCep, setLocalCep] = useState(cidadeRota);
    const [cepError, setCepError] = useState('');
    const [cepSaved, setCepSaved] = useState(false);
    const [isConfirmingClearData, setIsConfirmingClearData] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(false);
    const [fileToConfirm, setFileToConfirm] = useState<File | null>(null);

    useEffect(() => {
        setLocalCep(cidadeRota);
        setCepError('');
    }, [cidadeRota]);

    const handleCepInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
        setLocalCep(value);
        if (cepError) setCepError('');
        if (cepSaved) setCepSaved(false);
    };

    const handleSaveCep = () => {
        if (localCep && localCep.replace(/\D/g, '').length !== 8) {
            setCepError('Por favor, insira um CEP válido com 8 dígitos.');
            return;
        }
        setCidadeRota(localCep);
        setCepSaved(true);
        setTimeout(() => setCepSaved(false), 2500);
    };

    const onImportClick = () => { importInputRef.current?.click(); };
    const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImportError(null);
            setImportSuccess(false);
            setFileToConfirm(file);
        }
        event.target.value = ''; // Reset to allow re-selecting the same file
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
        <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            <div className="px-6 py-4">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">CEP de Partida</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify hyphens-auto">Seu CEP é usado para calcular rotas e fica salvo apenas no seu navegador.</p>
                <div className="flex items-start gap-2">
                    <div className="flex-1">
                        <Input id="cep" type="text" value={localCep} onChange={handleCepInputChange} icon={<LocationIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />} placeholder="00000-000" maxLength={9}/>
                        {cepError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{cepError}</p>}
                    </div>
                    <Button onClick={handleSaveCep} disabled={cepSaved} className={cepSaved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                        {cepSaved ? 'Salvo!' : 'Salvar'}
                    </Button>
                </div>
            </div>

            <div className="px-6 py-4">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Backup dos Dados Locais</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-justify hyphens-auto">Exporte um arquivo com seus dados salvos localmente (favoritos, CEP e configurações) ou importe um arquivo para restaurar suas preferências.</p>
                {importError && ( <div className="p-3 mb-3 border border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-start gap-2"> <AlertTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" /> <div><strong>Erro:</strong> {importError}</div> </div> )}
                {importSuccess && ( <div className="p-3 mb-3 border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm text-emerald-700 dark:text-emerald-300"> <strong>Sucesso!</strong> Seus dados foram importados. </div> )}
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={exportUserData}><FileJsonIcon className="h-5 w-5" /><span className="ml-2">Exportar</span></Button>
                    <Button variant="secondary" onClick={onImportClick}><FileJsonIcon className="h-5 w-5" /><span className="ml-2">Importar</span></Button>
                    <input ref={importInputRef} type="file" accept=".json" onChange={onFileSelected} className="hidden" />
                </div>
                {fileToConfirm && (
                    <div className="mt-4 p-3 border-2 border-dashed border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <p className="text-sm text-amber-900 dark:text-amber-200 text-justify hyphens-auto">Importar o arquivo <strong>{fileToConfirm.name}</strong> irá sobrescrever seus dados salvos neste navegador. Deseja continuar?</p>
                        <div className="mt-3 flex gap-3">
                            <Button onClick={onConfirmImport} className="flex-1 bg-amber-500 hover:bg-amber-600">Sim, importar</Button>
                            <Button variant="secondary" onClick={() => setFileToConfirm(null)} className="flex-1">Cancelar</Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800/50">
                <h3 className="text-base font-semibold text-red-800 dark:text-red-200">Apagar Dados Locais</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1 mb-4 text-justify hyphens-auto">Esta ação é irreversível e irá apagar todos os seus dados salvos neste navegador (favoritos, CEP e configurações). <strong className="font-bold">A página será recarregada.</strong></p>
                {!isConfirmingClearData ? (
                    <Button variant="destructive" onClick={() => setIsConfirmingClearData(true)}>
                        <AlertTriangleIcon className="h-5 w-5" />
                        <span className="ml-2">Apagar Dados</span>
                    </Button>
                ) : (
                    <div className="p-3 border-2 border-dashed border-red-400 dark:border-red-600 rounded-lg bg-white dark:bg-red-900/20">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-200">Tem certeza?</p>
                        <div className="mt-3 flex gap-3">
                            <Button variant="secondary" onClick={() => setIsConfirmingClearData(false)} className="flex-1">Cancelar</Button>
                            <Button variant="destructive" onClick={clearAllLocalData} className="flex-1">Sim, apagar tudo</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
