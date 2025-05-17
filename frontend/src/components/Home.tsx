import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import axios from 'axios';

interface UploadResponse {
  task_id: string;
  message: string;
  status: string;
}

const Home = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError(null);

    try {
      const response = await axios.post<UploadResponse>('http://localhost:8000/meeting/upload-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Store the task ID in localStorage for the MeetingList component to pick up
      localStorage.setItem('currentProcessingTask', response.data.task_id);

      // Redirect to meeting list
      navigate('/meetings');
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Button
        variant="outlined"
        startIcon={<ArrowForwardIcon />}
        onClick={() => navigate('/meetings')}
        sx={{ mb: 3 }}
        disabled={uploading}
      >
        Meeting List
      </Button>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Upload Meeting Recording
          </Typography>

          <Box sx={{ my: 3 }}>
            <input
              accept="audio/*"
              style={{ display: 'none' }}
              id="raised-button-file"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label htmlFor="raised-button-file">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUploadIcon />}
                disabled={uploading}
              >
                Select Audio File
              </Button>
            </label>
            {file && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Selected file: {file.name}
              </Typography>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            fullWidth
          >
            {uploading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Processing...
              </>
            ) : (
              'Upload and Process'
            )}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Home;