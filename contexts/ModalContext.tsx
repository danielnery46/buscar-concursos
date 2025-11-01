import React, { createContext, useState, useCallback, useContext, ReactNode, FC } from 'react';
import { ProcessedJob, SearchCriteria, PredictedCriteria, City } from '../types';
import {
    WebContentModal,
    MapModal,
    RouteMapModal,
    DonationModal,
    ChangelogModal,
    InteractiveTutorial,
    DefaultSearchModal,
    DefaultPredictedNewsModal,
    DataMigrationModal,
    CepInputModal
} from '../components/modals';

type ModalType =
    | 'webContent'
    | 'map'
    | 'routeMap'
    | 'donation'
    | 'changelog'
    | 'tutorial'
    | 'defaultSearch'
    | 'defaultPredictedNews'
    | 'dataMigration'
    | 'cepInput';

interface ModalPropsMap {
    webContent: { url: string; title: string };
    map: { job: ProcessedJob };
    routeMap: { job: ProcessedJob; userCep: string | null; filteredCity: string | null; filteredState: string | null };
    donation: Record<string, never>;
    changelog: Record<string, never>;
    tutorial: { onDone: () => void };
    defaultSearch: { onSave: (criteria: SearchCriteria) => void; isCityDataLoading: boolean; cityDataCache: Record<string, City[]> };
    defaultPredictedNews: { onSave: (criteria: PredictedCriteria) => void; title: string; description: string; };
    dataMigration: { onMigrate: () => void; onDiscard: () => void };
    cepInput: { onSave: (cep: string) => void; isLoggedIn: boolean; };
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
    const { modalType, modalProps, closeModal } = useModal();

    if (!modalType) {
        return null;
    }
    
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
        case 'tutorial':
            return <InteractiveTutorial isOpen={true} onClose={handleTutorialClose} />;
        case 'defaultSearch':
            return <DefaultSearchModal isOpen={true} onClose={closeModal} {...modalProps} />;
        case 'defaultPredictedNews':
            return <DefaultPredictedNewsModal isOpen={true} onClose={closeModal} {...modalProps} />;
        case 'dataMigration':
            return <DataMigrationModal isOpen={true} onClose={modalProps.onDiscard} {...modalProps} />;
        case 'cepInput':
            return <CepInputModal isOpen={true} onClose={closeModal} {...modalProps} />;
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