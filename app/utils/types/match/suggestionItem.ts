export type SuggestionItem = {
    place_id: number;
    lat: string;
    lon: string;
    address: {
        house_number?: string;
        road?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        postcode?: string;
        country?: string;
        country_code?: string;
    };
};