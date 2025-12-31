import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { api, Meeting } from '../services/api';

interface ProcessingStatus {
  status: string;
  progress: number;
  meeting_id?: number;
  filename?: string;
  error?: string;
}

const MeetingList: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingTasks, setProcessingTasks] = useState<{ [key: string]: ProcessingStatus }>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 5;
  const navigate = useNavigate();

  const fetchMeetings = useCallback(async (currentPage: number) => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * itemsPerPage;
      const data = await api.getMeetings(skip, itemsPerPage);
      setMeetings(data.meetings);
      setTotalCount(data.total);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError('Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  // Initial load of meetings and check for processing tasks
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchMeetings(1);

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
  }, [fetchMeetings]);

  // Fetch meetings when page changes
  useEffect(() => {
    fetchMeetings(page);
  }, [page, fetchMeetings]);

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
          await fetchMeetings(page);

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


  const addProcessingTask = (taskId: string) => {
    console.log('Adding processing task:', taskId); // Debug log
    setProcessingTasks(prev => ({
      ...prev,
      [taskId]: { status: 'pending', progress: 0 }
    }));
  };

  const handleMeetingClick = (meetingId: number) => {
    navigate(`/meetings/${meetingId}`);
  };

  const handleDeleteClick = (event: React.MouseEvent, meeting: Meeting) => {
    event.stopPropagation();
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (meetingToDelete) {
      try {
        await api.deleteMeeting(meetingToDelete.id);
        // Refresh the current page after deletion
        await fetchMeetings(page);
      } catch (error) {
        console.error('Error deleting meeting:', error);
      }
    }
    setDeleteDialogOpen(false);
    setMeetingToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setMeetingToDelete(null);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
            <Card key={meeting.id} sx={{ mb: 2, cursor: 'pointer' }}>
              <CardContent>
                <ListItem
                  component={Link}
                  to={`/meetings/${meeting.id}`}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={meeting.title}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          Status: {meeting.status}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="text.secondary">
                          Processed: {new Date(meeting.created_at).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={(e) => handleDeleteClick(e, meeting)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Meeting</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this meeting? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeetingList;