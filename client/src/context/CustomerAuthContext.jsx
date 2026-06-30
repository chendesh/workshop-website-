import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const CustomerAuthContext = createContext(null);

// ── Set explicit persistence (fixes mobile Chrome session issues) ──
setPersistence(auth, browserLocalPersistence).catch(console.error);

// ── Retry Firestore reads ─────────────────────────────────────────
// Mobile Firestore WebSocket takes 5-8 seconds to connect on cold start.
// Without retry, getDoc fails and looks like "wrong password".
const getDocWithRetry = async (docRef, retries = 3, delayMs = 5000) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await getDoc(docRef);
    } catch (err) {
      console.warn(`Firestore getDoc attempt ${attempt + 1} failed:`, err.message);
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return context;
};

export const CustomerAuthProvider = ({ children }) => {
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          // Use retry here too — onAuthStateChanged fires before Firestore is ready on mobile
          const userDocSnap = await getDocWithRetry(userDocRef);

          if (userDocSnap.exists() && userDocSnap.data().role === 'customer') {
            setCurrentCustomer({ ...firebaseUser, ...userDocSnap.data() });
          } else {
            await signOut(auth);
            setCurrentCustomer(null);
          }
        } else {
          setCurrentCustomer(null);
        }
      } catch (error) {
        console.error('Error fetching customer role:', error);
        setCurrentCustomer(null);
      } finally {
        setCustomerLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const customerLogin = async (email, password) => {
    // Step 1: Firebase Auth — this can fail on mobile with auth/network-request-failed
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Step 2: Firestore profile fetch — use retry (mobile needs 5-8 sec to connect)
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDocWithRetry(userDocRef);

    if (!userDocSnap.exists() || userDocSnap.data().role !== 'customer') {
      await signOut(auth);
      throw new Error('not-customer');
    }

    const userData = { ...firebaseUser, ...userDocSnap.data() };
    setCurrentCustomer(userData);
    return userData;
  };

  const customerSignup = async (email, password, name, phone) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const newUserData = {
      uid: firebaseUser.uid,
      email,
      name,
      phone,
      role: 'customer',
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);

    const userData = { ...firebaseUser, ...newUserData };
    setCurrentCustomer(userData);
    return userData;
  };

  const customerLogout = async () => {
    await signOut(auth);
    setCurrentCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        currentCustomer,
        customerLoading,
        customerLogin,
        customerSignup,
        customerLogout,
        isCustomerAuthenticated: !!currentCustomer,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export default CustomerAuthContext;