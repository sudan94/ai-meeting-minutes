import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';

interface MeetingDetails {
  id: string;
  filename: string;
  created_at: string;
  title: string;
  summary?: string;
  duration?: string;
  participants?: string;
  key_points?: string;
  action_items?: string;
}

const MeetingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetingDetails();
  }, [id]);

  const fetchMeetingDetails = async () => {
    try {
      const response = await axios.get<MeetingDetails>(`http://localhost:8000/meeting/get_meeting_by_id/${id}`);
      setMeeting(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch meeting details. Please try again later.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseJsonString = (jsonString: string | undefined): any[] => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return [];
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/meetings')}
        >
          Back to Meetings
        </Button>
      </Box>
    );
  }

  if (!meeting) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Alert severity="info">Meeting not found</Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/meetings')}
          sx={{ mt: 2 }}
        >
          Back to Meetings
        </Button>
      </Box>
    );
  }

  const participants = parseJsonString(meeting.participants);
  const keyPoints = parseJsonString(meeting.key_points);
  const actionItems = parseJsonString(meeting.action_items);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/meetings')}
        sx={{ mb: 3 }}
      >
        Back to Meetings
      </Button>

      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            {meeting.title}
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              File: {meeting.filename}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Processed: {new Date(meeting.created_at).toLocaleString()}
            </Typography>
            {meeting.duration && (
              <Typography variant="body2" color="text.secondary">
                Duration: {meeting.duration}
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {meeting.summary && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <Typography variant="body1">
                {meeting.summary}
              </Typography>
            </Box>
          )}

          {participants.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Participants
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {participants.map((participant, index) => (
                  <Paper
                    key={index}
                    elevation={1}
                    sx={{ px: 2, py: 1, bgcolor: 'primary.light', color: 'white' }}
                  >
                    {participant}
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {keyPoints.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Key Points
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {keyPoints.map((point, index) => (
                  <Typography component="li" key={index} variant="body1">
                    {point}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          {actionItems.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Action Items
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {actionItems.map((item, index) => (
                  <Typography component="li" key={index} variant="body1">
                    {item}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MeetingDetails;
