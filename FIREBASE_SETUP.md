# Firebase Setup Instructions

## Overview
This project now includes Firebase Firestore integration to track:
- Local storage data
- Cookie data
- External link clicks (counts per domain)

## Setup Steps

### 1. Create a Web App (If You Don't Have One)

If you don't see any apps in your Firebase project, you need to create one first:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cool-beans-96cd7`
3. Click the gear icon ⚙️ (top left) > **Project Settings**
4. Scroll down to the **Your apps** section
5. If you see "No apps yet" or an empty list:
   - Click the **Add app** button (or the web icon `</>`)
   - A dialog will appear asking you to register your app
   - **App nickname** (required): Enter a name like "Website", "Sweet Digital Spaces", or "Main Site"
   - **Check the box** for "Also set up Firebase Hosting" - You can check this if you want, but it's optional
   - Click **Register app**
6. After registration, you'll see a screen with your Firebase configuration
   - This shows the `firebaseConfig` object with all your values
   - **Copy these values** - you'll need them in the next step

**Note**: If you already have a web app registered, you can:
- Click on the web app icon to see its configuration
- Or click the gear icon next to the app name to see settings

### 2. Get Your Firebase Configuration Values

Once you have a web app:

1. In **Project Settings** > **Your apps** section
2. Find your web app (it will show the web icon `</>`)
3. You'll see the configuration in one of two formats:
   - **Option A**: If you see a code snippet with `firebaseConfig`, copy the values from there
   - **Option B**: If you see individual fields, copy these values:
     - `apiKey`
     - `authDomain` (should be `cool-beans-96cd7.firebaseapp.com`)
     - `projectId` (should be `cool-beans-96cd7`)
     - `storageBucket` (should be `cool-beans-96cd7.appspot.com`)
     - `messagingSenderId`
     - `appId`

### 3. Update Firebase Configuration File

Open `public/firebase-config.js` and replace the placeholder values with your actual values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...", // Your actual API key
  authDomain: "cool-beans-96cd7.firebaseapp.com", // Should already match
  projectId: "cool-beans-96cd7", // Should already match
  storageBucket: "cool-beans-96cd7.appspot.com", // Should already match
  messagingSenderId: "123456789", // Your messaging sender ID
  appId: "1:123456789:web:abc123" // Your app ID
};
```

### 4. Enable Firestore
1. In Firebase Console, go to **Build** > **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development) or **Start in production mode** (with security rules)
4. Select a location for your database
5. Click **Enable**

### 5. (Optional) Set Up Security Rules
If you want to restrict access, update Firestore security rules in Firebase Console:
- Go to **Firestore Database** > **Rules** tab
- Example rules for tracking (adjust as needed):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userTracking/{userId} {
      allow read: if request.auth != null; // Only authenticated users can read
      allow write: if true; // Anyone can write (for tracking)
    }
  }
}
```

## How It Works

### Data Collection
- **Local Storage**: All key-value pairs from `localStorage` are collected
- **Cookies**: All cookies are collected
- **External Link Clicks**: Tracks clicks on links that go to external domains (different from current site)
- **User ID**: A unique ID is generated and stored in localStorage for tracking

### Data Storage
Data is stored in Firestore collection: `userTracking`
- Document ID: User's unique ID
- Fields:
  - `userId`: Unique identifier
  - `localStorage`: Object with all local storage data
  - `cookies`: Object with all cookie data
  - `externalLinkClicks`: Object mapping domain names to click counts
  - `totalExternalClicks`: Sum of all external link clicks
  - `lastUpdated`: Server timestamp
  - `userAgent`: Browser user agent string
  - `timestamp`: ISO timestamp

### Automatic Updates
- Initial save: On page load (after 1 second delay)
- Periodic save: Every 5 minutes
- Click tracking: Immediately when external links are clicked
- Final save: Before page unload

## Viewing Data

To view collected data:
1. Go to Firebase Console > **Firestore Database**
2. Navigate to the `userTracking` collection
3. Each document represents a user's tracking data

## Testing

1. Open your website in a browser
2. Open browser console (F12)
3. You should see: "Firebase initialized successfully"
4. Click on an external link (e.g., andrewtheiss.com or chocolate.party)
5. Check Firestore console to see the data being saved

## Troubleshooting

- **"Firebase SDK not loaded"**: Check that Firebase scripts are loading correctly
- **Permission errors**: Check Firestore security rules
- **No data saved**: Check browser console for errors, verify Firebase config values are correct
- **Can't find "Add app" button**: 
  - Make sure you're in **Project Settings** (gear icon in top left)
  - Scroll down to the **Your apps** section
  - If you still don't see it, try refreshing the page or check if you have the correct permissions for the project
- **"No apps yet" but can't add one**: 
  - Make sure you're logged into Firebase with the correct account
  - Verify you have edit access to the project
  - Try clicking the project name in the top left to switch projects if you have multiple

