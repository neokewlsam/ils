import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Modal,
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import debounce from 'lodash.debounce';

const API_URL = 'http://localhost:3001';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    learningPath: {
      main: '#2196f3', // This is a blue color
    },
  },
});

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  maxHeight: '80vh',
  overflow: 'auto',
};

const InteractiveLearningSystem = () => {
  const [subjects, setSubjects] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [subtopics, setSubtopics] = useState([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [explanation, setExplanation] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [questionHistory, setQuestionHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [explanationModalOpen, setExplanationModalOpen] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/subjects`);
      setSubjects(response.data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setError('Failed to load subjects. Please refresh the page.');
    }
  };

  const handleSubjectSelect = (subject) => {
    setSelectedSubject(subject);
    setSelectedTopic('');
    setSelectedSubtopic('');
    setSubtopics([]);
    setExplanation('');
    setVideoUrl('');
    setQuestionHistory([]);
    setError('');
  };

  const handleTopicSelect = async (topic) => {
    setSelectedTopic(topic);
    setSelectedSubtopic('');
    setExplanation('');
    setVideoUrl('');
    setQuestionHistory([]);
    setError('');
    setLoading(true);

    try {
      const response = await axios.get(`${API_URL}/subtopics/${selectedSubject}/${topic}`);
      if (Array.isArray(response.data) && response.data.length > 0) {
        setSubtopics(response.data);
      } else {
        throw new Error('Invalid subtopics data received');
      }
    } catch (error) {
      console.error('Failed to fetch subtopics:', error);
      setError('Failed to load subtopics. Please try again.');
      setSubtopics([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (subject, topic, subtopic) => {
    try {
      const response = await axios.post(`${API_URL}/explain`, { subject, topic, subtopic });
      setExplanation(response.data.explanation);
      setVideoUrl(response.data.videoUrl);
    } catch (error) {
      console.error('Failed to get explanation:', error);
      setError('Failed to load explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetchExplanation = useCallback(
    debounce(fetchExplanation, 300),
    []
  );

  const handleSubtopicSelect = (subtopic) => {
    setSelectedSubtopic(subtopic);
    setLoading(true);
    setError('');
    debouncedFetchExplanation(selectedSubject, selectedTopic, subtopic);
    setSelectionModalOpen(false);
  };

  const handleQuestionSubmit = async () => {
    if (!currentQuestion.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/question`, { 
        subject: selectedSubject, 
        topic: selectedTopic, 
        subtopic: selectedSubtopic, 
        question: currentQuestion,
        questionHistory: questionHistory
      });

      setQuestionHistory([...questionHistory, {
        question: currentQuestion,
        answer: response.data.answer
      }]);
      setCurrentQuestion('');
    } catch (error) {
      console.error('Failed to get answer:', error);
      setError('Failed to get an answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" sx={{ backgroundColor: 'black' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ color: 'white', flexGrow: 1 }}>Interactive Learning System</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, mb: 3, backgroundColor: 'white', color: 'black' }}>
          <Typography variant="h4" gutterBottom>Hi, I'm your AI tutor</Typography>
          <Typography variant="h5" gutterBottom>Welcome to AI-powered learning</Typography>
          <Typography variant="body1">
            I've analyzed millions of published educational resources to provide you with the best learning experience.
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2} sx={{ cursor: 'pointer' }} onClick={() => setSelectionModalOpen(true)}>
            <Typography variant="h6" sx={{ flexGrow: 1, color: 'learningPath.main' }}>Select Your Learning Path</Typography>
            <IconButton size="small">
              <EditIcon />
            </IconButton>
          </Box>
          {selectedSubtopic ? (
            <Box mt={2}>
              <Chip label={`Subject: ${selectedSubject}`} sx={{ mr: 1 }} />
              <Chip label={`Topic: ${selectedTopic}`} sx={{ mr: 1 }} />
              <Chip label={`Subtopic: ${selectedSubtopic}`} sx={{ mr: 1 }} />
              <IconButton size="small" onClick={() => setExplanationModalOpen(true)}>
                <InfoIcon />
              </IconButton>
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" mt={2}>
              Click above to select a subject, topic, and subtopic to begin.
            </Typography>
          )}
        </Paper>

        {selectedSubtopic && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '500px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>Q&A</Typography>
                <Box sx={{ display: 'flex', mb: 2 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="Type your question here"
                    sx={{ mr: 1 }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleQuestionSubmit}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Ask'}
                  </Button>
                </Box>
                <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {questionHistory.map((item, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText 
                          primary={<Typography variant="subtitle2">Q: {item.question}</Typography>}
                          secondary={<Typography variant="body2">A: {item.answer}</Typography>}
                        />
                      </ListItem>
                      {index < questionHistory.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '500px', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>Video Content</Typography>
                <Box sx={{ flexGrow: 1, position: 'relative' }}>
                  {videoUrl ? (
                    <iframe
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                      src={videoUrl}
                      title="Educational Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <Typography>Video will be displayed once selections are understood.</Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
      </Container>

      {/* Selection Modal */}
      <Modal
        open={selectionModalOpen}
        onClose={() => setSelectionModalOpen(false)}
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ color: 'learningPath.main' }}>
            Select Your Learning Path
          </Typography>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <Typography variant="subtitle1">Subject</Typography>
              <Grid container spacing={1}>
                {Object.keys(subjects).map((subject) => (
                  <Grid item key={subject}>
                    <Button
                      size="small"
                      variant={selectedSubject === subject ? "contained" : "outlined"}
                      onClick={() => handleSubjectSelect(subject)}
                    >
                      {subject}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            {selectedSubject && (
              <Grid item>
                <Typography variant="subtitle1">Topic</Typography>
                <Grid container spacing={1}>
                  {subjects[selectedSubject]?.map((topic) => (
                    <Grid item key={topic}>
                      <Button
                        size="small"
                        variant={selectedTopic === topic ? "contained" : "outlined"}
                        onClick={() => handleTopicSelect(topic)}
                      >
                        {topic}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}
            {selectedTopic && (
              <Grid item>
                <Typography variant="subtitle1">Subtopic</Typography>
                <Grid container spacing={1}>
                  {subtopics.map((subtopic) => (
                    <Grid item key={subtopic}>
                      <Button
                        size="small"
                        variant={selectedSubtopic === subtopic ? "contained" : "outlined"}
                        onClick={() => handleSubtopicSelect(subtopic)}
                      >
                        {subtopic}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}
          </Grid>
          <Button onClick={() => setSelectionModalOpen(false)} sx={{ mt: 2 }}>
            Close
          </Button>
        </Box>
      </Modal>

      {/* Explanation Modal */}
      <Modal
        open={explanationModalOpen}
        onClose={() => setExplanationModalOpen(false)}
      >
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            Explanation
          </Typography>
          <Typography variant="body1">{explanation}</Typography>
          <Button onClick={() => setExplanationModalOpen(false)} sx={{ mt: 2 }}>
            Close
          </Button>
        </Box>
      </Modal>
    </ThemeProvider>
  );
};

export default InteractiveLearningSystem;