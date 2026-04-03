(function() {
  const TRACKING_URL = '/api/track'; // In a real scenario, this would be the absolute URL of the analytics server

  function generateSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  async function sendEvent(eventType, additionalData = {}) {
    let locationData = null;
    try {
      let loc = sessionStorage.getItem('analytics_location');
      if (loc) {
        locationData = JSON.parse(loc);
      } else {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const data = await res.json();
        locationData = { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), country: data.country };
        sessionStorage.setItem('analytics_location', JSON.stringify(locationData));
      }
    } catch (e) {
      console.warn('Could not fetch location data');
    }

    const payload = {
      eventType,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      sessionId: generateSessionId(),
      lat: locationData ? locationData.lat : null,
      lng: locationData ? locationData.lng : null,
      country: locationData ? locationData.country : null,
      ...additionalData
    };

    // Use sendBeacon for page unload events if possible, otherwise fetch
    if (navigator.sendBeacon && (eventType === 'page_leave' || eventType === 'session_end')) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(TRACKING_URL, blob);
    } else {
      fetch(TRACKING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }).catch(err => console.error('Analytics tracking failed:', err));
    }
  }

  // Track page view on load
  window.addEventListener('load', () => {
    sendEvent('page_view');
  });

  // Track clicks
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button');
    if (target) {
      sendEvent('click', {
        targetText: target.innerText || target.value || 'unknown',
        targetTag: target.tagName,
        targetHref: target.href || ''
      });
    }
  });

  // Expose to window for custom events
  window.AnalyticsTracker = {
    track: sendEvent
  };
})();
