const express = require('express');
const cors = require('cors');
const OpenAI = require("openai");
const { google } = require('googleapis');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// Initialize cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600 });

const subjects = {
  'Math': ['Algebra', 'Geometry', 'Calculus'],
  'Science': ['Physics', 'Chemistry', 'Biology'],
  'History': ['Ancient Civilizations', 'World Wars', 'Industrial Revolution'],
  'Literature': ['Shakespeare', 'Poetry', 'Modern Novels']
};

app.get('/subjects', (req, res) => {
  res.json(subjects);
});

app.get('/subtopics/:subject/:topic', async (req, res) => {
  const { subject, topic } = req.params;
  const cacheKey = `subtopics-${subject}-${topic}`;

  // Check cache first
  const cachedSubtopics = cache.get(cacheKey);
  if (cachedSubtopics) {
    return res.json(cachedSubtopics);
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user", 
        content: `Generate a list of 5 important subtopics for ${topic} in ${subject}. 
                  Return the response as a JSON array of strings, like this: 
                  ["Subtopic 1", "Subtopic 2", "Subtopic 3", "Subtopic 4", "Subtopic 5"]`
      }],
    });

    let subtopics;
    try {
      subtopics = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      // If parsing fails, attempt to extract subtopics manually
      subtopics = completion.choices[0].message.content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
    }

    if (!Array.isArray(subtopics) || subtopics.length === 0) {
      throw new Error('Invalid subtopics format received from OpenAI');
    }

    // Cache the result
    cache.set(cacheKey, subtopics);

    res.json(subtopics);
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate subtopics', details: error.message });
  }
});

app.post('/explain', async (req, res) => {
  const { subject, topic, subtopic } = req.body;
  const cacheKey = `${subject}-${topic}-${subtopic}`;

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const [completionResponse, videoResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [{role: "user", content: `Explain the subtopic '${subtopic}' within the topic '${topic}' in the subject '${subject}' for a student.`}],
      }),
      youtube.search.list({
        part: 'snippet',
        q: `${subject} ${topic} ${subtopic} education`,
        type: 'video',
        maxResults: 1,
        videoEmbeddable: true,
        relevanceLanguage: 'en'
      })
    ]);
    
    const videoId = videoResponse.data.items[0]?.id.videoId;
    const videoUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

    const responseData = { 
      explanation: completionResponse.choices[0].message.content,
      videoUrl: videoUrl
    };

    // Cache the result
    cache.set(cacheKey, responseData);

    res.json(responseData);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to generate explanation or fetch video' });
  }
});

app.post('/question', async (req, res) => {
  const { subject, topic, subtopic, question, questionHistory } = req.body;

  try {
    // Construct the context from question history
    const context = questionHistory.map(item => 
      `Q: ${item.question}\nA: ${item.answer}`
    ).join('\n\n');

    const prompt = `
Subject: ${subject}
Topic: ${topic}
Subtopic: ${subtopic}

Previous Q&A:
${context}

New Question: ${question}

Please provide a concise answer to the new question, taking into account the context of the previous questions and answers.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an AI tutor specializing in providing clear and concise answers to student questions." },
        { role: "user", content: prompt }
      ],
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});