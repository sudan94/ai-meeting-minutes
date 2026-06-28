import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/meeting';

export interface Meeting {
  id: number;
  title: string;
  created_at: string;
  filename?: string;
  summary?: string;
  participants?: string;
  key_points?: string;
  action_items?: string;
  transcript?: string;
  trello?: boolean;
}

export interface MeetingsResponse {
  total: number;
  meetings: Meeting[];
}

export const api = {
  async uploadAudio(file: File): Promise<{ task_id: string; message: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post<{ task_id: string; message: string; status: string }>(`${API_BASE_URL}/upload-audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getMeetings(skip: number = 0, limit: number = 5): Promise<MeetingsResponse> {
    const response = await axios.get(`${API_BASE_URL}/get_meetings`, {
      params: { skip, limit },
    });
    return response.data as MeetingsResponse;
  },

  async getMeeting(id: number): Promise<Meeting> {
    const response = await axios.get(`${API_BASE_URL}/get_meeting_by_id/${id}`);
    return response.data as Meeting;
  },

  async deleteMeeting(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/delete_meeting/${id}`);
  },

  async sendToTrello(id: number): Promise<void> {
    await axios.get(`${API_BASE_URL}/send_to_trello/${id}`);
  },

  async getProcessingStatus(taskId: string): Promise<{
    status: string;
    progress: number;
    meeting_id?: number;
    filename?: string;
    error?: string;
  }> {
    const response = await axios.get<{
      status: string;
      progress: number;
      meeting_id?: number;
      filename?: string;
      error?: string;
    }>(`${API_BASE_URL}/processing-status/${taskId}`);
    return response.data;
  },
};
