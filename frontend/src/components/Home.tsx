import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { api } from '../services/api';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/x-m4a'];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Home = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const navigate = useNavigate();

  const validateAndSet = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav|m4a|ogg|webm|flac)$/i)) {
      setError('Please select an audio file (MP3, WAV, M4A, OGG, FLAC)');
      return;
    }else if (f.size > 24 *1024 * 1024){
      setError('File size exceeds 25 MB. Please select a smaller file.');
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) validateAndSet(event.target.files[0]);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.[0]) validateAndSet(event.dataTransfer.files[0]);
  }, []);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const fakeProgress = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await api.uploadAudio(file);
      clearInterval(fakeProgress);
      setUploadProgress(100);
      localStorage.setItem('currentProcessingTask', result.task_id);
      navigate('/meetings');
    } catch {
      clearInterval(fakeProgress);
      setUploadProgress(0);
      setError('Upload failed. Make sure the backend is running and try again.');
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="text"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/meetings')}
        >
          View all meetings
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Upload a Meeting Recording
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Drop an audio file below or click to browse. The recording will be transcribed and
            summarized automatically using AI.
          </Typography>

          {/* Drop zone */}
          <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragging(false)}
            sx={{
              border: '2px dashed',
              borderColor: dragging ? 'primary.main' : file ? 'success.main' : 'divider',
              borderRadius: 2,
              py: 5,
              px: 2,
              textAlign: 'center',
              bgcolor: dragging ? 'primary.50' : file ? 'success.50' : 'background.default',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onClick={() => !uploading && document.getElementById('audio-file-input')?.click()}
          >
            <input
              accept="audio/*"
              style={{ display: 'none' }}
              id="audio-file-input"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />

            {file ? (
              <>
                <AudioFileIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>{file.name}</Typography>
                <Typography variant="body2" color="text.secondary">{formatBytes(file.size)}</Typography>
                {!uploading && (
                  <Button size="small" sx={{ mt: 1 }} onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                    Change file
                  </Button>
                )}
              </>
            ) : (
              <>
                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="subtitle1" color="text.secondary">
                  Drag & drop your audio file here
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  or click to browse — MP3, WAV, M4A, OGG supported aaa
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Max file size: 25 MB
                </Typography>
              </>
            )}
          </Box>

          {file && file.size > 24 * 1024 * 1024 && !uploading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              File is over 25 MB.
            </Alert>
          )}

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Uploading… {uploadProgress}%
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleUpload}
            disabled={!file || uploading || file.size > 24 * 1024 * 1024}
            sx={{ mt: 3 }}
          >
            {uploading ? (
              <><CircularProgress size={20} sx={{ mr: 1 }} color="inherit" /> Processing…</>
            ) : (
              'Transcribe & Summarize'
            )}
          </Button>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
        Powered by OpenAI Whisper (transcription) + GPT-4o-mini (summarization)
      </Typography>
    </Box>
  );
};

export default Home;
