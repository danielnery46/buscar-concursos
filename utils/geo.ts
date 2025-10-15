import { ProcessedJob, City } from '../types';
import { normalizeText } from './text';

/**
 * Enriches a job object with geographic coordinates if a matching city is found.
 * @param job The job object to process.
 * @param allCitiesMap A map of normalized city names to city data.
 * @returns The job object, potentially with 'lat' and 'lon' properties.
 */
export function processJobData(job: ProcessedJob, allCitiesMap: Map<string, City>): ProcessedJob {
    if (job.cidadeEfetiva && job.mentionedStates && job.mentionedStates.length > 0) {
        // Assume the first mentioned state is the correct one for simplicity.
        const state = job.mentionedStates[0].toLowerCase();
        const normalizedCity = normalizeText(job.cidadeEfetiva);
        const cityKey = `${normalizedCity}-${state}`;
        const cityData = allCitiesMap.get(cityKey);

        if (cityData) {
            return {
                ...job,
                lat: cityData.lat,
                lon: cityData.lon,
            };
        }
    }
    return job;
}

/**
 * Calculates the distance between two geographical points using the Haversine formula.
 * @param lat1 Latitude of the first point.
 * @param lon1 Longitude of the first point.
 * @param lat2 Latitude of the second point.
 * @param lon2 Longitude of the second point.
 * @returns The distance in kilometers.
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
