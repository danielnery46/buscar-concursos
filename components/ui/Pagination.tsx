import { usePagination, DOTS } from '../../hooks/usePagination';
import { ArrowLeftIcon, ArrowRightIcon } from '../Icons';
import { Button } from './Button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    const paginationRange = usePagination({ currentPage, totalPages });

    if (totalPages <= 1 || paginationRange.length < 2) {
        return null;
    }

    const onNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const onPrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    return (
        <nav className="flex items-center justify-center" aria-label="Paginação">
            <div className="flex items-center gap-2">
                <Button
                    variant="secondary"
                    size="md"
                    onClick={onPrevious}
                    disabled={currentPage === 1}
                    aria-label="Página anterior"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                </Button>
                <div className="hidden md:flex items-center gap-2">
                    {paginationRange.map((pageNumber, index) => {
                        if (pageNumber === DOTS) {
                            return <span key={`dots-${index}`} className="px-4 py-2 text-gray-500 dark:text-gray-400">...</span>;
                        }

                        return (
                            <Button
                                key={pageNumber}
                                variant={currentPage === pageNumber ? 'primary' : 'secondary'}
                                size="icon"
                                onClick={() => onPageChange(pageNumber as number)}
                                aria-current={currentPage === pageNumber ? 'page' : undefined}
                                aria-label={`Ir para a página ${pageNumber}`}
                            >
                                {pageNumber}
                            </Button>
                        );
                    })}
                </div>
                <div className="md:hidden text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                    Página {currentPage} de {totalPages}
                </div>
                <Button
                    variant="secondary"
                    size="md"
                    onClick={onNext}
                    disabled={currentPage === totalPages}
                    aria-label="Próxima página"
                >
                    <span className="hidden sm:inline">Próxima</span>
                    <ArrowRightIcon className="h-4 w-4" />
                </Button>
            </div>
        </nav>
    );
};
