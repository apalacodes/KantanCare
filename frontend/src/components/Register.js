import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient'
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

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Update user profile
      await updateProfile(user, {
        displayName: formData.name
      });
      
      // Store user profile locally
      const userProfile = {
        email: user.email,
        role: formData.role,
        name: formData.name,
        uid: user.uid
      };
      localStorage.setItem('userProfile', JSON.stringify(userProfile));
      // Notify app about profile change so routing updates immediately
      try {
        window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: userProfile }));
      } catch (err) {
        // fall back silently
      }
      
      // After signup, take the user to medical profile setup to complete their profile
      navigate('/medical-profile-setup');
    } catch (error) {
      console.error('Registration error:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      default:
        return 'Registration failed. Please try again.';
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
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#1a202c' }}>Create Account</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>

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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">I am a</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Healthcare Provider</option>
              </select>
            </div>

            {error && <div className="error">{error}</div>}
            
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="switch-link">
            <Link to="/login" style={{ color: '#667eea', textDecoration: 'none' }}>
              Already have an account? Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;