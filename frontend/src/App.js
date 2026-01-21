import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import Login from './components/Login';
import Register from './components/Register';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import MedicalProfileSetup from './components/MedicalProfileSetup';
import MedicalRecords from './components/MedicalRecords';
import AIChat from './components/AIChat';
import AIWidget from './components/AIWidget';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  // Profile warning will be rendered by an inner component that uses router hooks

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from localStorage or API
        const storedProfile = localStorage.getItem('userProfile');
        const profile = storedProfile ? JSON.parse(storedProfile) : {
          role: 'patient',
          name: firebaseUser.displayName || firebaseUser.email,
          email: firebaseUser.email,
          uid: firebaseUser.uid
        };
        
        setUser(firebaseUser);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
        localStorage.removeItem('userProfile');
      }
      setLoading(false);
    });

    // Listen for profile updates emitted by Register/Login so we can update role immediately
    const handleProfileUpdate = (e) => {
      try {
        const profile = e?.detail;
        if (profile) setUserProfile(profile);
      } catch (err) {
        console.warn('Failed to apply profile update event', err);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    };
  }, []);

  // Check whether user has completed their medical/institution profile

  // Profile completeness check moved into `ProfileWarning` component below

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading KantanCare...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              !user ? (
                <Login />
              ) : (
                <Navigate to={userProfile?.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'} replace />
              )
            } 
          />
          <Route 
            path="/register" 
            element={
              !user ? (
                <Register />
              ) : (
                <Navigate to={userProfile?.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'} replace />
              )
            } 
          />

          {/* Protected Routes */}
          <Route 
            path="/patient-dashboard" 
            element={
              user && userProfile?.role === 'patient' ? (
                <PatientDashboard user={userProfile} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/doctor-dashboard" 
            element={
              user && userProfile?.role === 'doctor' ? (
                <DoctorDashboard user={userProfile} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/medical-profile-setup" 
            element={
              user ? (
                <MedicalProfileSetup user={userProfile} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/medical-records" 
            element={
              user ? (
                <MedicalRecords user={userProfile} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/ai-chat" 
            element={
              user ? (
                <AIChat user={userProfile} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Default redirect */}
          <Route 
            path="/" 
            element={
              <Navigate 
                to={
                  !user 
                    ? "/login" 
                    : userProfile?.role === 'doctor' 
                      ? "/doctor-dashboard" 
                      : "/patient-dashboard"
                } 
                replace 
              />
            } 
          />
        </Routes>

        {/* AI Widget - Show on all authenticated pages */}
        {user && <AIWidget />}

        {/* Profile completeness warning modal - rendered by router-aware child */}
        {user && <ProfileWarning userProfile={userProfile} />}
      </div>
    </Router>
  );
}

function ProfileWarning({ userProfile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isProfileComplete = (profile) => {
      try {
        if (!profile) return false;
        if (profile.role === 'doctor') {
          const inst = JSON.parse(localStorage.getItem('institutionProfile') || '{}');
          return Boolean(inst && inst.instName && inst.instAddress);
        }
        const mp = JSON.parse(localStorage.getItem('medicalProfile') || '{}');
        return Boolean(mp && (mp.gender || mp.medicalHistory || mp.allergies || mp.conditions));
      } catch (err) {
        return false;
      }
    };

    if (!userProfile) {
      setVisible(false);
      return;
    }

    // don't show while the user is already on the setup page
    if (location.pathname === '/medical-profile-setup') {
      setVisible(false);
      return;
    }

    const complete = isProfileComplete(userProfile);
    setVisible(!complete);
  }, [userProfile, location.pathname]);

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Complete your profile</h3>
        <p>
          We noticed your medical profile is not yet completed. Completing your profile
          helps clinicians provide better care. Please fill in the required information now.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button className="btn" onClick={() => setVisible(false)}>Remind me later</button>
          <button
            className="btn btn-primary"
            onClick={() => { navigate('/medical-profile-setup'); }}
          >
            Complete Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;