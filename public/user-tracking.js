// User Tracking Script for Firebase Firestore
// Collects local storage, cookies, and tracks external link clicks

class UserTracker {
  constructor() {
    this.userId = this.getOrCreateUserId();
    this.externalLinkClicks = {};
    this.dataLoaded = false;
    this.loadExistingData().then(() => {
      this.dataLoaded = true;
      this.init();
    });
  }

  // Generate or retrieve a unique user ID
  getOrCreateUserId() {
    let userId = localStorage.getItem('userTrackingId');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userTrackingId', userId);
    }
    return userId;
  }

  // Collect all local storage data
  collectLocalStorage() {
    const storageData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        storageData[key] = localStorage.getItem(key);
      } catch (e) {
        console.warn('Could not read local storage key:', key);
      }
    }
    return storageData;
  }

  // Collect all cookies
  collectCookies() {
    const cookies = {};
    if (document.cookie) {
      document.cookie.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        if (key) {
          cookies[key] = decodeURIComponent(value || '');
        }
      });
    }
    return cookies;
  }

  // Check if a URL is external (different domain)
  isExternalLink(url) {
    try {
      const linkHost = new URL(url, window.location.href).hostname;
      const currentHost = window.location.hostname;
      return linkHost !== currentHost && linkHost !== '';
    } catch (e) {
      return false;
    }
  }

  // Load existing click data from Firestore
  async loadExistingData() {
    try {
      const doc = await db.collection('userTracking').doc(this.userId).get();
      if (doc.exists) {
        const data = doc.data();
        if (data.externalLinkClicks) {
          // Merge existing clicks with current state
          this.externalLinkClicks = { ...data.externalLinkClicks };
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }

  // Track external link click
  trackExternalLinkClick(url) {
    if (!this.isExternalLink(url)) {
      return;
    }

    // Wait for data to load before tracking
    if (!this.dataLoaded) {
      // Queue the click if data isn't loaded yet
      setTimeout(() => this.trackExternalLinkClick(url), 100);
      return;
    }

    try {
      const urlObj = new URL(url, window.location.href);
      const domain = urlObj.hostname;
      
      // Increment click count for this domain locally
      if (!this.externalLinkClicks[domain]) {
        this.externalLinkClicks[domain] = 0;
      }
      this.externalLinkClicks[domain]++;

      // Update Firestore using atomic increment (prevents race conditions)
      this.updateFirestoreAtomically(domain);
    } catch (e) {
      console.error('Error tracking external link click:', e);
    }
  }

  // Save data to Firestore
  async saveToFirestore() {
    try {
      const userData = {
        userId: this.userId,
        localStorage: this.collectLocalStorage(),
        cookies: this.collectCookies(),
        externalLinkClicks: this.externalLinkClicks,
        totalExternalClicks: Object.values(this.externalLinkClicks).reduce((sum, count) => sum + count, 0),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      // Save or update document in 'userTracking' collection
      await db.collection('userTracking').doc(this.userId).set(userData, { merge: true });
      
      console.log('User data saved to Firestore successfully');
    } catch (error) {
      console.error('Error saving to Firestore:', error);
    }
  }

  // Update external link clicks using atomic increment (prevents race conditions)
  async updateFirestoreAtomically(domain) {
    try {
      const updateData = {
        [`externalLinkClicks.${domain}`]: firebase.firestore.FieldValue.increment(1),
        totalExternalClicks: firebase.firestore.FieldValue.increment(1),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('userTracking').doc(this.userId).set(updateData, { merge: true });
    } catch (error) {
      console.error('Error updating Firestore atomically:', error);
      // Fallback to regular update if increment fails
      this.updateFirestore();
    }
  }

  // Update only the external link clicks in Firestore (fallback method)
  async updateFirestore() {
    try {
      // First, get current data to ensure we don't lose clicks from other windows
      const doc = await db.collection('userTracking').doc(this.userId).get();
      let currentClicks = {};
      
      if (doc.exists && doc.data().externalLinkClicks) {
        currentClicks = doc.data().externalLinkClicks;
      }
      
      // Merge with local clicks (take the maximum to avoid losing data)
      Object.keys(this.externalLinkClicks).forEach(domain => {
        const localCount = this.externalLinkClicks[domain] || 0;
        const remoteCount = currentClicks[domain] || 0;
        currentClicks[domain] = Math.max(localCount, remoteCount);
      });

      const updateData = {
        externalLinkClicks: currentClicks,
        totalExternalClicks: Object.values(currentClicks).reduce((sum, count) => sum + count, 0),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('userTracking').doc(this.userId).set(updateData, { merge: true });
    } catch (error) {
      console.error('Error updating Firestore:', error);
    }
  }

  // Initialize tracking
  init() {
    // Track clicks on all links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href) {
        const url = link.href;
        if (this.isExternalLink(url)) {
          this.trackExternalLinkClick(url);
        }
      }
    }, true); // Use capture phase to catch all clicks

    // Save initial data on page load (after data is loaded)
    const saveInitialData = () => {
      if (this.dataLoaded) {
        this.saveToFirestore();
      } else {
        setTimeout(saveInitialData, 100);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(saveInitialData, 1000);
      });
    } else {
      setTimeout(saveInitialData, 1000);
    }

    // Save data periodically (every 5 minutes) - sync with server
    setInterval(() => {
      this.updateFirestore(); // Use update method to sync with server data
    }, 5 * 60 * 1000);

    // Save data before page unload
    window.addEventListener('beforeunload', () => {
      this.updateFirestore(); // Use update method to sync with server data
    });
  }
}

// Initialize tracker when Firebase is ready
let userTracker;

function initializeTracker() {
  if (typeof firebase !== 'undefined' && typeof db !== 'undefined') {
    userTracker = new UserTracker();
  } else {
    // Retry after a short delay if Firebase isn't ready yet
    setTimeout(initializeTracker, 100);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTracker);
} else {
  // DOM is already loaded
  initializeTracker();
}

