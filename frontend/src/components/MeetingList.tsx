import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Meeting {
  id: string;
  filename: string;
  created_at: string;
  title: string;
  summary?: string;
}

interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
  meeting_id?: number;
  filename?: string;
}

const MeetingList = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingTasks, setProcessingTasks] = useState<{ [key: string]: ProcessingStatus }>({});
  const navigate = useNavigate();

  // Initial load of meetings and check for processing tasks
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchMeetings();

        // Check for any ongoing processing tasks from localStorage
        const currentTaskId = localStorage.getItem('currentProcessingTask');
        if (currentTaskId) {
          addProcessingTask(currentTaskId);
          localStorage.removeItem('currentProcessingTask'); // Clear it after adding
        }
      } catch (err) {
        console.error('Initial load error:', err);
        setError('Failed to load initial data');
      }
    };

    loadInitialData();
  }, []);

  // Set up interval for checking processing status
  useEffect(() => {
    const taskIds = Object.keys(processingTasks);
    if (taskIds.length > 0) {
      const intervalId = setInterval(checkProcessingStatus, 2000);
      return () => clearInterval(intervalId);
    }
  }, [processingTasks]);

  const checkProcessingStatus = async () => {
    const taskIds = Object.keys(processingTasks);
    for (const taskId of taskIds) {
      try {
        const response = await axios.get<ProcessingStatus>(`http://localhost:8000/meeting/processing-status/${taskId}`);
        console.log('Processing status:', response.data); // Debug log

        if (response.data.status === 'completed') {
          // Remove completed task and refresh meetings
          setProcessingTasks(prev => {
            const newTasks = { ...prev };
            delete newTasks[taskId];
            return newTasks;
          });
          await fetchMeetings();

          // If we have a meeting ID, navigate to it
          if (response.data.meeting_id) {
            navigate(`/meetings/${response.data.meeting_id}`);
          }
        } else if (response.data.status === 'error') {
          setError(response.data.error || 'Processing failed');
          // Remove the error task after showing the error
          setProcessingTasks(prev => {
            const newTasks = { ...prev };
            delete newTasks[taskId];
            return newTasks;
          });
        } else {
          // Update the task status
          setProcessingTasks(prev => ({
            ...prev,
            [taskId]: response.data
          }));
        }
      } catch (err) {
        console.error('Status check error:', err);
        // Remove the task if we can't check its status
        setProcessingTasks(prev => {
          const newTasks = { ...prev };
          delete newTasks[taskId];
          return newTasks;
        });
      }
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await axios.get<Meeting[]>('http://localhost:8000/meeting/get_meetings');
      console.log('Meetings response:', response.data); // Debug log

      if (response.data) {
        setMeetings(response.data);
        setError(null);
      } else {
        setError('No meetings data received');
        setMeetings([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch meetings. Please try again later.');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const addProcessingTask = (taskId: string) => {
    console.log('Adding processing task:', taskId); // Debug log
    setProcessingTasks(prev => ({
      ...prev,
      [taskId]: { status: 'pending', progress: 0 }
    }));
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Processed Meetings
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Upload New Recording
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Show processing tasks */}
      {Object.entries(processingTasks).map(([taskId, status]) => (
        <Card key={taskId} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Processing: {status.filename || 'New Recording'}
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Status: {status.status}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={status.progress}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Progress: {status.progress}%
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Show loading spinner only if we're loading AND there are no meetings */}
      {loading && meetings.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : meetings.length === 0 && Object.keys(processingTasks).length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No meetings processed yet. Upload a recording to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {meetings.map((meeting) => (
            <Card key={meeting.id} sx={{ mb: 2 }}>
              <CardContent>
                <ListItem>
                  <ListItemText
                    primary={meeting.filename}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          Title: <Link to={`/meetings/${meeting.id}`}>{meeting.title}</Link>
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="text.secondary">
                          Processed: {new Date(meeting.created_at).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {meeting.summary && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Summary: {meeting.summary}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </List>
      )}
    </Box>
  );
};

export default MeetingList;