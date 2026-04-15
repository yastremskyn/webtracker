import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Firebase config
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
}

// Initialize Firebase for the backend (using client SDK for simplicity in this environment)
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies and handle CORS for the tracker
  app.use(express.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Tracking API Endpoint
  app.post('/api/track', async (req, res) => {
    try {
      const { eventType, url, path: pagePath, userAgent, referrer, sessionId, screenResolution, lat, lng, country } = req.body;
      
      if (!eventType) {
        return res.status(400).json({ error: 'eventType is required' });
      }

      const eventData = {
        eventType,
        url: url || '',
        path: pagePath || '',
        userAgent: userAgent || req.headers['user-agent'] || '',
        referrer: referrer || '',
        sessionId: sessionId || 'anonymous',
        screenResolution: screenResolution || '',
        timestamp: new Date().toISOString(),
        ip: req.ip || req.socket.remoteAddress || '',
        lat: lat || null,
        lng: lng || null,
        country: country || null
      };

      await addDoc(collection(db, 'events'), eventData);
      
      res.status(200).json({ success: true, message: 'Event tracked successfully' });
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  });

  // Chat API Endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: systemInstruction }] },
          { role: 'model', parts: [{ text: 'Understood. I will act as the analytics assistant and use this data.' }] },
          ...messages
        ],
      });

      res.status(200).json({ text: response.text });
    } catch (error) {
      console.error('Error in chat API:', error);
      res.status(500).json({ error: 'Failed to generate AI response' });
    }
  });

  // Email Alerts Endpoint
  app.post('/api/alerts/test', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return res.status(500).json({ error: 'Email credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are not configured in .env' });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const targetEmail = email || process.env.GMAIL_USER;

      await transporter.sendMail({
        from: `"WebAnalytics Pro" <${process.env.GMAIL_USER}>`,
        to: targetEmail,
        subject: 'Test Alert: WebAnalytics Pro',
        text: 'This is a test alert from your WebAnalytics Pro dashboard. Email notifications are working!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4F46E5;">WebAnalytics Pro</h2>
            <h3>Test Alert Successful</h3>
            <p>Hello!</p>
            <p>This is a test alert from your WebAnalytics Pro dashboard. If you are reading this, your email notifications are configured correctly.</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This is an automated message, please do not reply.</p>
          </div>
        `
      });

      res.status(200).json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email. Check your credentials.' });
    }
  });

  // Serve the tracking script
  app.get('/tracker.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tracker.js'));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
