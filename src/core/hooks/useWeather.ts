import {useQuery} from '@tanstack/react-query';

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface WeatherData {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    cloudCoverage: number;
}

const OPENWEATHER_API_KEY = '574d5548afa918877542154ec174ccf5';
const CACHE_TIME = 1000 * 60 * 30;
const STALE_TIME = 1000 * 60 * 15;

export const useWeather = (coordinates?: Coordinates) => {
    const fetchWeather = async (): Promise<WeatherData> => {
        if (!coordinates) {
            throw new Error('Coordinates are required to fetch weather data.');
        }
        const {latitude, longitude} = coordinates;
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/onecall?` +
            `lat=${latitude}&lon=${longitude}` +
            `&appid=${OPENWEATHER_API_KEY}` +
            `&units=metric` +
            `&exclude=minutely,daily,alerts`
        );
        if (!response.ok) {
            throw new Error('Failed to fetch weather data from OpenWeather.');
        }
        const data = await response.json();
        if (
            !data?.current ||
            !Array.isArray(data.current.weather) ||
            data.current.weather.length === 0
        ) {
            throw new Error('Invalid weather data: missing current conditions.');
        }
        if (!Array.isArray(data.hourly) || data.hourly.length === 0) {
            throw new Error('Invalid weather data: missing hourly forecast.');
        }
        return {
            temperature: Math.round(data.current.temp ?? 0),
            condition: data.current.weather[0].description ?? 'Unknown',
            humidity: data.current.humidity ?? 0,
            windSpeed: Math.round((data.current.wind_speed ?? 0) * 3.6),
            cloudCoverage: Math.round((data.hourly[0].pop ?? 0) * 100),
        };
    };

    return useQuery<WeatherData>({
        queryKey: ['weather', coordinates?.latitude, coordinates?.longitude],
        queryFn: fetchWeather,
        enabled: !!coordinates?.latitude && !!coordinates?.longitude,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
        retry: 2,
    });
};
