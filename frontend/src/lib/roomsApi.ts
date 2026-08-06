import { api } from "./api";

export type RoomStatus = "ACTIVE" | "ENDED" | "DELETED";
export type ParticipantRole = "HOST" | "CO_HOST" | "SPEAKER" | "LISTENER";

export interface ParticipantResponse {
  id: number;
  roomId: number;
  userId: number;
  userEmail: string;
  userFullName: string;
  role: ParticipantRole;
  joinedAt: string;
}

export interface RoomResponse {
  id: number;
  code: string;
  name: string;
  ownerId: number;
  ownerName: string;
  status: RoomStatus;
  createdAt: string;
  participants: ParticipantResponse[];
}

export interface CreateRoomRequest {
  name: string;
}

export const roomsApi = {
  createRoom: async (data: CreateRoomRequest): Promise<RoomResponse> => {
    const response = await api.post<RoomResponse>("/v1/rooms", data);
    return response.data;
  },

  listMyRooms: async (): Promise<RoomResponse[]> => {
    const response = await api.get<RoomResponse[]>("/v1/rooms/my");
    return response.data;
  },

  getRoom: async (id: number | string): Promise<RoomResponse> => {
    const response = await api.get<RoomResponse>(`/v1/rooms/${id}`);
    return response.data;
  },

  joinRoom: async (id: number | string): Promise<ParticipantResponse> => {
    const response = await api.post<ParticipantResponse>(`/v1/rooms/${id}/join`);
    return response.data;
  },

  leaveRoom: async (id: number | string): Promise<void> => {
    await api.post(`/v1/rooms/${id}/leave`);
  },

  deleteRoom: async (id: number | string): Promise<void> => {
    await api.delete(`/v1/rooms/${id}`);
  },
};
