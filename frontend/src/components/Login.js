import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Get user profile from localStorage or set default
      const existingProfile = localStorage.getItem('userProfile');
      let userProfile;
      
      if (existingProfile) {
        userProfile = JSON.parse(existingProfile);
      } else {
        // Determine role based on email (temporary logic)
        const role = formData.email.includes('doctor') ? 'doctor' : 'patient';
        userProfile = {
          email: user.email,
          role: role,
          name: user.displayName || user.email.split('@')[0],
          uid: user.uid
        };
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
      // Notify app about profile change so routing updates immediately
      try {
        window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: userProfile }));
      } catch (err) {
        // ignore
      }
      }
      
      // Navigate based on role
      navigate(userProfile.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      default:
        return 'Login failed. Please try again.';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-container">
            <div className="logo">KC</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px' }}>KantanCare</h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Healthcare Management</p>
            </div>
          </div>
        </div>
        
        <div className="auth-body">
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1a202c' }}>Welcome Back</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            {error && <div className="error">{error}</div>}
            
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="switch-link">
            <Link to="/register" style={{ color: '#667eea', textDecoration: 'none' }}>
              Don't have an account? Create one here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;