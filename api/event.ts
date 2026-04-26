import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore/lite';
import fs from 'fs';
import path from 'path';

let db: any;
let firebaseConfig: any = null;

function getFirebaseConfig() {
  if (firebaseConfig) return firebaseConfig;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    firebaseConfig = JSON.parse(fileContents);
  } catch (err) {
    console.error('Failed to read firebase config:', err);
  }
  return firebaseConfig;
}

export default async function handler(req, res) {
  // Налаштування CORS для дозволу запитів з інших доменів
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Обробка preflight-запиту (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    // Initialize Firebase lazily
    if (!db) {
      const config = getFirebaseConfig();
      if (!config) {
        return res.status(500).json({ error: 'Firebase configuration is missing' });
      }
      const firebaseApp = !getApps().length ? initializeApp(config) : getApp();
      db = getFirestore(firebaseApp, config.firestoreDatabaseId || '(default)');
    }

    const { eventType, url, path: pagePath, userAgent, referrer, sessionId, screenResolution, lat, lng, country, projectId } = body;

    
    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    const eventData = {
      eventType,
      projectId: projectId || 'anonymous',
      url: url || '',
      path: pagePath || '',
      userAgent: userAgent || req.headers['user-agent'] || '',
      referrer: referrer || '',
      sessionId: sessionId || 'anonymous',
      screenResolution: screenResolution || '',
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
      lat: lat || null,
      lng: lng || null,
      country: country || null
    };

    await addDoc(collection(db, 'events'), eventData);
    
    res.status(200).json({ success: true, message: 'Event tracked successfully' });
  } catch (error: any) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event', details: error.message || String(error) });
  }
}
