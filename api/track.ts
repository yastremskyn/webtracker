import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

export default async function handler(req, res) {
  // Налаштування CORS для дозволу запитів з інших доменів
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
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
