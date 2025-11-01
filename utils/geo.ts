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


/**
 * Calculates driving distances from an origin to multiple jobs in a single batch API call using OSRM.
 * @param origin The starting point with latitude and longitude.
 * @param jobs An array of job objects that have lat/lon coordinates.
 * @returns A promise that resolves to the array of jobs, updated with driving distance in km.
 */
export async function calculateDrivingDistances(origin: { lat: number; lon: number }, jobs: ProcessedJob[]): Promise<ProcessedJob[]> {
    if (jobs.length === 0) {
        return [];
    }
    
    // OSRM expects {longitude},{latitude}
    const locations = [origin, ...jobs.map(j => ({ lat: j.lat!, lon: j.lon! }))];
    const coordinatesString = locations.map(loc => `${loc.lon},${loc.lat}`).join(';');
    
    const url = `https://router.project-osrm.org/table/v1/driving/${coordinatesString}?sources=0&annotations=distance`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OSRM API request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.code !== 'Ok' || !data.distances || !data.distances[0]) {
            console.error('Invalid response from OSRM API:', data);
            throw new Error('Invalid response format from OSRM API.');
        }

        // distances[0] contains distances from the source (index 0) to all other points.
        // We slice(1) to skip the distance from the source to itself.
        const distancesInMeters = data.distances[0].slice(1);

        return jobs.map((job, index) => {
            const distanceInMeters = distancesInMeters[index];
            return {
                ...job,
                // If OSRM returns null (no route found), distance will be undefined.
                distance: distanceInMeters !== null ? distanceInMeters / 1000 : undefined,
            };
        });

    } catch (error) {
        console.error("Failed to calculate driving distances via OSRM. Falling back to straight-line (Haversine) distance.", error);
        // Fallback robusto para a distância em linha reta se a API OSRM falhar.
        return jobs.map(job => ({
            ...job,
            distance: haversineDistance(origin.lat, origin.lon, job.lat!, job.lon!),
        }));
    }
}