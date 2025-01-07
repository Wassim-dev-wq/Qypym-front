import api from "@/app/create-match/services/api";


export async function requestJoinMatch(matchId: string) {
    const response = await api.post(`/matches/${matchId}/join`);

    return response.data;
}