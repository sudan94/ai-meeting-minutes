import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  List,
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
  Chip,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Delete as DeleteIcon, MicNone as MicIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
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
    } catch {
      setError('Failed to fetch meetings. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchMeetings(1);
      const currentTaskId = localStorage.getItem('currentProcessingTask');
      if (currentTaskId) {
        setProcessingTasks({ [currentTaskId]: { status: 'pending', progress: 0 } });
        localStorage.removeItem('currentProcessingTask');
      }
    };
    loadInitialData();
  }, [fetchMeetings]);

  useEffect(() => {
    fetchMeetings(page);
  }, [page, fetchMeetings]);

  useEffect(() => {
    const taskIds = Object.keys(processingTasks);
    if (taskIds.length === 0) return;

    const intervalId = setInterval(async () => {
      for (const taskId of taskIds) {
        try {
          const data = await api.getProcessingStatus(taskId);

          if (data.status === 'completed') {
            setProcessingTasks(prev => {
              const next = { ...prev };
              delete next[taskId];
              return next;
            });
            await fetchMeetings(page);
            if (data.meeting_id) navigate(`/meetings/${data.meeting_id}`);
          } else if (data.status === 'error') {
            setError(data.error || 'Processing failed');
            setProcessingTasks(prev => {
              const next = { ...prev };
              delete next[taskId];
              return next;
            });
          } else {
            setProcessingTasks(prev => ({ ...prev, [taskId]: data }));
          }
        } catch {
          setProcessingTasks(prev => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
        }
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [processingTasks, fetchMeetings, navigate, page]);

  const handleDeleteClick = (event: React.MouseEvent, meeting: Meeting) => {
    event.stopPropagation();
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (meetingToDelete) {
      try {
        await api.deleteMeeting(meetingToDelete.id);
        await fetchMeetings(page);
      } catch {
        setError('Failed to delete meeting');
      }
    }
    setDeleteDialogOpen(false);
    setMeetingToDelete(null);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Meeting Minutes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalCount} recording{totalCount !== 1 ? 's' : ''} processed
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate('/')}>
          + New Recording
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {Object.entries(processingTasks).map(([taskId, status]) => (
        <Card key={taskId} sx={{ mb: 2, border: '1px solid', borderColor: 'primary.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="subtitle2" fontWeight={600}>
                Processing: {status.filename || 'recording'}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={status.progress}
              sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {status.progress}% — {status.status}
            </Typography>
          </CardContent>
        </Card>
      ))}

      {loading && meetings.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : meetings.length === 0 && Object.keys(processingTasks).length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <MicIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No meetings yet. Upload a recording to get started.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/')}>
            Upload Recording
          </Button>
        </Card>
      ) : (
        <List disablePadding>
          {meetings.map((meeting) => (
            <Card key={meeting.id} sx={{ mb: 2 }}>
              <CardActionArea onClick={() => navigate(`/meetings/${meeting.id}`)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {meeting.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {meeting.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(meeting.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Completed"
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                  {meeting.trello && (
                    <Chip label="Trello" color="primary" size="small" variant="outlined" />
                  )}
                  <Tooltip title="Delete meeting">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteClick(e, meeting)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </List>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete meeting?</DialogTitle>
        <DialogContent>
          <Typography>
            "<strong>{meetingToDelete?.title}</strong>" will be permanently deleted. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeetingList;
