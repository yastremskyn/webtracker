import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';

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
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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
