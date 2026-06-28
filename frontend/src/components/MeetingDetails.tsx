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
  Chip,
  Tabs,
  Tab,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import PersonIcon from '@mui/icons-material/Person';
import { api, Meeting } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
    {value === index && children}
  </Box>
);

const MeetingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingToTrello, setSendingToTrello] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.getMeeting(Number(id))
      .then(data => setMeeting(data))
      .catch(() => setError('Failed to load meeting details. Please try again.'))
      .finally(() => setLoading(false));
  }, [id]);

  const parseJson = (value: string | undefined): string[] => {
    if (!value) return [];
    try { return JSON.parse(value); } catch { return []; }
  };

  const handleSendToTrello = async () => {
    if (!id) return;
    setSendingToTrello(true);
    try {
      await api.sendToTrello(Number(id));
      setMeeting(prev => prev ? { ...prev, trello: true } : prev);
      setSnackbar({ open: true, message: 'Successfully sent to Trello!', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to send to Trello. Check your Trello credentials.', severity: 'error' });
    } finally {
      setSendingToTrello(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !meeting) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Meeting not found'}</Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/meetings')}>
          Back to Meetings
        </Button>
      </Box>
    );
  }

  const participants = parseJson(meeting.participants);
  const keyPoints = parseJson(meeting.key_points);
  const actionItems = parseJson(meeting.action_items);
  const hasTabs = meeting.transcript;

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', mt: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/meetings')}>
          Back
        </Button>
        {meeting.trello ? (
          <Button variant="outlined" color="success" startIcon={<SendIcon />} disabled>
            Sent to Trello
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={sendingToTrello ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            onClick={handleSendToTrello}
            disabled={sendingToTrello}
          >
            {sendingToTrello ? 'Sending…' : 'Send to Trello'}
          </Button>
        )}
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {/* Title + meta */}
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {meeting.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
            {meeting.filename && (
              <Typography variant="body2" color="text.secondary">
                📁 {meeting.filename}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              🕐 {new Date(meeting.created_at).toLocaleString()}
            </Typography>
          </Box>

          {/* Participants */}
          {participants.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {participants.map((p, i) => (
                <Chip key={i} icon={<PersonIcon />} label={p} size="small" variant="outlined" color="primary" />
              ))}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
            <Tab label="Summary" />
            <Tab label={`Key Points (${keyPoints.length})`} />
            <Tab label={`Action Items (${actionItems.length})`} />
            {hasTabs && <Tab label="Transcript" />}
          </Tabs>

          {/* Summary tab */}
          <TabPanel value={tab} index={0}>
            {meeting.summary ? (
              <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                {meeting.summary}
              </Typography>
            ) : (
              <Typography color="text.secondary">No summary available.</Typography>
            )}
          </TabPanel>

          {/* Key Points tab */}
          <TabPanel value={tab} index={1}>
            {keyPoints.length > 0 ? (
              <List dense disablePadding>
                {keyPoints.map((point, i) => (
                  <ListItem key={i} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <FiberManualRecordIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                    </ListItemIcon>
                    <ListItemText primary={point} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No key points extracted.</Typography>
            )}
          </TabPanel>

          {/* Action Items tab */}
          <TabPanel value={tab} index={2}>
            {actionItems.length > 0 ? (
              <List dense disablePadding>
                {actionItems.map((item, i) => (
                  <ListItem key={i} disablePadding sx={{ mb: 1 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckBoxOutlineBlankIcon color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No action items found.</Typography>
            )}
          </TabPanel>

          {/* Transcript tab */}
          {hasTabs && (
            <TabPanel value={tab} index={3}>
              <Box
                sx={{
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  maxHeight: 400,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {meeting.transcript}
              </Box>
            </TabPanel>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MeetingDetails;
