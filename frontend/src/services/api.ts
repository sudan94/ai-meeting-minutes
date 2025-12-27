import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/meeting';

export interface Meeting {
  id: number;
  title: string;
  status: string;
  created_at: string;
  audio_path?: string;
  transcript?: string;
  summary?: string;
}

export const api = {
  async uploadAudio(file: File): Promise<Meeting> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE_URL}/upload-audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as Meeting;
  },

  async getMeetings(): Promise<Meeting[]> {
    const response = await axios.get(`${API_BASE_URL}/get_meetings`);
    return response.data as Meeting[];
  },

  async getMeeting(id: number): Promise<Meeting> {
    const response = await axios.get(`${API_BASE_URL}/get_meeting_by_id/${id}`);
    return response.data as Meeting;
  },

  async deleteMeeting(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/delete_meeting/${id}`);
  },
};