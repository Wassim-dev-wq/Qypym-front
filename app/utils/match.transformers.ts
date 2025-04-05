import { MatchFormData, CreateMatchRequest, Location } from './types/match/av';

export const formatZonedDateTime = (date: Date, time: Date): string => {
    const d = new Date(date);
    d.setHours(time.getHours(), time.getMinutes(), 0);
    return d.toISOString().slice(0, 19) + '+00:00';
};

export const transformFormDataToRequest = (formData: MatchFormData): CreateMatchRequest => ({
    title: formData.title,
    startDate: formatZonedDateTime(formData.date, formData.time),
    duration: formData.duration,
    format: formData.format,
    location: {
        address: formData.location,
        coordinates: {
            latitude: formData.latitude!,
            longitude: formData.longitude!
        }
    },
    skillLevel: formData.skillLevel
});