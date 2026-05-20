import React from 'react';
import { SearchCriteria } from '../types';
import { formatSearchCriteria } from '../utils/formatters';
import { SearchFormContent } from './FormContents';
import { useUserData } from '../contexts/UserDataContext';
import { CategorizedSearchForm } from './PredictedNewsSearchForm';
import { BriefcaseIcon } from './Icons';

interface SearchFormProps {
    criteria: SearchCriteria;
    onCriteriaChange: React.Dispatch<React.SetStateAction<SearchCriteria>>;
    onClearFilters: () => void;
    onRunFavorite: (searchCriteria: SearchCriteria) => void;
    isCityDataLoading: boolean;
    cities: any[];
    summaryData: { totalOpportunities: number; totalVacancies: number; highestSalary: number; } | null;
    isLoading: boolean;
    onProximitySearch: () => void;
    isProximityLoading: boolean;
    proximityError: string | null;
    cidadeRota: string;
}

export const SearchForm: React.FC<SearchFormProps> = (props) => {
    const { 
        favoriteSearches, setFavoriteSearches,
        defaultSearch, setDefaultSearch
    } = useUserData();

    const filterFormComponentProps = {
        criteria: props.criteria,
        onCriteriaChange: props.onCriteriaChange,
        isCityDataLoading: props.isCityDataLoading,
        cities: props.cities,
        onProximitySearch: props.onProximitySearch,
        isProximityLoading: props.isProximityLoading,
        proximityError: props.proximityError,
        cidadeRota: props.cidadeRota,
    };
    
    const summaryProps = props.summaryData ? {
        ...props.summaryData,
        opportunitiesLabel: "Oportunidades",
        opportunitiesIcon: <BriefcaseIcon className="h-5 w-5 text-blue-500" />,
        totalVacancies: props.summaryData.totalVacancies,
        highestSalary: props.summaryData.highestSalary,
    } : null;

    return (
        <CategorizedSearchForm<SearchCriteria>
            criteria={props.criteria}
            onClearFilters={props.onClearFilters}
            onRunFavorite={props.onRunFavorite}
            favoriteItems={favoriteSearches}
            setFavoriteItems={setFavoriteSearches}
            defaultItem={defaultSearch}
            setDefaultItem={setDefaultSearch}
            formatItem={formatSearchCriteria}
            FilterFormComponent={SearchFormContent}
            filterFormComponentProps={filterFormComponentProps}
            summaryData={summaryProps}
            isLoading={props.isLoading}
        />
    );
};