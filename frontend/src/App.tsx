import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MicIcon from '@mui/icons-material/Mic';
import Home from './components/Home';
import MeetingList from './components/MeetingList';
import MeetingDetails from './components/MeetingDetails';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#5C6BC0',
      light: '#7986CB',
      dark: '#3949AB',
    },
    secondary: {
      main: '#26A69A',
    },
    background: {
      default: '#F5F6FA',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #E8EAF0' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.dark', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <Toolbar>
        <MicIcon sx={{ mr: 1.5 }} />
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, cursor: 'pointer', letterSpacing: '-0.3px' }}
          onClick={() => navigate('/')}
        >
          MeetingMind AI
        </Typography>
        <Button
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ opacity: location.pathname === '/' ? 1 : 0.7 }}
        >
          Upload
        </Button>
        <Button
          color="inherit"
          onClick={() => navigate('/meetings')}
          sx={{ opacity: location.pathname.startsWith('/meetings') ? 1 : 0.7 }}
        >
          Meetings
        </Button>
      </Toolbar>
    </AppBar>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <NavBar />
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/meetings" element={<MeetingList />} />
              <Route path="/meetings/:id" element={<MeetingDetails />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
