(function() {
  // Get the script tag that loaded this file to determine the analytics server URL
  const scripts = document.getElementsByTagName('script');
  let analyticsServerUrl = '';
  let projectId = '';
  for (let i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.includes('client-script.js')) {
      const url = new URL(scripts[i].src);
      analyticsServerUrl = url.origin;
      projectId = scripts[i].getAttribute('data-project-id') || '';
      break;
    }
  }

  const TRACKING_URL = analyticsServerUrl + '/api/event';

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
      projectId,
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
