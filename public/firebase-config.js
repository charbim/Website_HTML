// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDoxzMqiVbLBDfe4N3VCoRsx-aoXVYizDM",
  authDomain: "cool-beans-96cd7.firebaseapp.com",
  projectId: "cool-beans-96cd7",
  storageBucket: "cool-beans-96cd7.firebasestorage.app",
  messagingSenderId: "576266183427",
  appId: "1:576266183427:web:a88040a221bd7e615dff36",
  measurementId: "G-8Y30NJ5SRM"
};

// Initialize Firebase and Firestore
let app, db;

if (typeof firebase !== 'undefined') {
  try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
} else {
  console.error('Firebase SDK not loaded');
}

