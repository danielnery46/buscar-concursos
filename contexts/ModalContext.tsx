import React, { createContext, useState, useCallback, useContext, ReactNode, FC } from 'react';
import { ProcessedJob, SearchCriteria, PredictedCriteria, City } from '../types';
import {
    WebContentModal,
    MapModal,
    RouteMapModal,
    DonationModal,
    ChangelogModal,
    CepInputModal,
    InteractiveTutorial,
    DefaultSearchModal,
    DefaultPredictedNewsModal,
    DataMigrationModal
} from '../components/modals';
import { useUserData } from './UserDataContext';
import { useAuth } from './AuthContext';

type ModalType =
    | 'webContent'
    | 'map'
    | 'routeMap'
    | 'donation'
    | 'changelog'
    | 'cepInput'
    | 'tutorial'
    | 'defaultSearch'
    | 'defaultPredictedNews'
    | 'dataMigration';

interface ModalPropsMap {
    webContent: { url: string; title: string };
    map: { job: ProcessedJob };
    routeMap: { job: ProcessedJob; userCep: string };
    donation: Record<string, never>;
    changelog: Record<string, never>;
    cepInput: { job: ProcessedJob };
    tutorial: { onDone: () => void };
    defaultSearch: { onSave: (criteria: SearchCriteria) => void; isCityDataLoading: boolean; cityDataCache: Record<string, City[]> };
    defaultPredictedNews: { onSave: (criteria: PredictedCriteria) => void; title: string; description: string; };
    dataMigration: { onMigrate: () => void; onDiscard: () => void };
}

interface ModalState {
  modalType: ModalType | null;
  modalProps: any;
}

interface ModalContextType extends ModalState {
  openModal: <T extends ModalType>(modalType: T, modalProps: ModalPropsMap[T]) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalManager: React.FC = () => {
    const { modalType, modalProps, closeModal, openModal } = useModal();
    const { setCidadeRota } = useUserData();
    const { user } = useAuth();

    if (!modalType) {
        return null;
    }

    const handleSaveCepAndOpenRoute = (cep: string) => {
        setCidadeRota(cep);
        if (modalProps.job) {
            closeModal();
            // Um pequeno atraso para permitir que o modal de CEP feche antes de abrir o próximo
            setTimeout(() => {
                openModal('routeMap', { job: modalProps.job, userCep: cep });
            }, 250);
        } else {
            closeModal();
        }
    };
    
    // Uma função é necessária para satisfazer o `onClose` do tutorial, que também define uma chave no localStorage.
    const handleTutorialClose = () => {
        if (modalProps.onDone) {
            modalProps.onDone();
        }
        closeModal();
    };

    switch(modalType) {
        case 'webContent':
            return <WebContentModal isOpen={true} onClose={closeModal} {...modalProps} />;
        case 'map':
            return <MapModal isOpen={true} onClose={closeModal} {...modalProps} />;
        case 'routeMap':
            return <RouteMapModal isOpen={true} onClose={closeModal} {...modalProps} />;
        case 'donation':
            return <DonationModal isOpen={true} onClose={closeModal} />;
        case 'changelog':
            return <ChangelogModal isOpen={true} onClose={closeModal} />;
        case 'cepInput':
            return <CepInputModal isOpen={true} onClose={closeModal} onSave={handleSaveCepAndOpenRoute} isLoggedIn={!!user} />;
        case 'tutorial':
            return <InteractiveTutorial isOpen={true} onClose={handleTutorialClose} />;
        case 'defaultSearch':
            return <DefaultSearchModal isOpen={true} onClose={closeModal} {...modalProps} />;
        case 'defaultPredictedNews':
            return <DefaultPredictedNewsModal isOpen={true} onClose={closeModal} {...modalProps} />;
        case 'dataMigration':
            return <DataMigrationModal isOpen={true} onClose={modalProps.onDiscard} {...modalProps} />;
        default:
            return null;
    }
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: FC<ModalProviderProps> = ({ children }) => {
    const [state, setState] = useState<ModalState>({ modalType: null, modalProps: {} });

    const openModal = useCallback(<T extends ModalType>(modalType: T, modalProps: ModalPropsMap[T]) => {
        setState({ modalType, modalProps });
    }, []);

    const closeModal = useCallback(() => {
        setState({ modalType: null, modalProps: {} });
    }, []);

    const value = { ...state, openModal, closeModal };

    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};