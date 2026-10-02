import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// Mesmo projeto Firebase usado pela fila de atendimento (TechQueue).
const firebaseConfig = {
  apiKey: 'AIzaSyDVHhF1LcLxqdb4xJDONkCoNhLS8HC7OxY',
  authDomain: 'filaarius.firebaseapp.com',
  projectId: 'filaarius',
  storageBucket: 'filaarius.firebasestorage.app',
  messagingSenderId: '515606001825',
  appId: '1:515606001825:web:977a8fddeb1d025ec758e0',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
