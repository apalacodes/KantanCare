import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getAppointments, getHealthSummary } from '../services/api';

const PatientDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockAppointments = [
        {
          id: 1,
          doctor: 'Dr. Sarah Johnson',
          specialty: 'Family Medicine',
          date: '2026-01-25',
          time: '10:00 AM',
          type: 'Follow-up',
          status: 'confirmed'
        },
        {
          id: 2,
          doctor: 'Dr. Michael Chen',
          specialty: 'Cardiology',
          date: '2026-02-02',
          time: '2:00 PM',
          type: 'Consultation',
          status: 'pending'
        }
      ];

      const mockHealthData = {
        recentVitals: {
          bloodPressure: '120/80',
          heartRate: '72 bpm',
          temperature: '98.6°F',
          weight: '70 kg'
        },
        medications: [
          { name: 'Lisinopril', dosage: '10mg', frequency: 'Daily' },
          { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' }
        ],
        upcomingTests: [
          { name: 'Annual Blood Work', date: '2026-02-15' },
          { name: 'Mammogram', date: '2026-03-01' }
        ]
      };

      setAppointments(mockAppointments);
      setHealthData(mockHealthData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderOverview = () => (
    <div>
      <div className="card">
        <h2>Welcome back, {user?.name || 'Patient'}!</h2>
        <p style={{ color: '#718096', marginBottom: '24px' }}>
          Here's an overview of your health dashboard and upcoming appointments.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{appointments.length}</span>
          <span className="stat-label">Upcoming Appointments</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{healthData?.medications?.length || 0}</span>
          <span className="stat-label">Active Medications</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{healthData?.upcomingTests?.length || 0}</span>
          <span className="stat-label">Pending Tests</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">Good</span>
          <span className="stat-label">Health Status</span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Upcoming Appointments</h3>
          {appointments.length === 0 ? (
            <p style={{ color: '#a0aec0', textAlign: 'center', padding: '20px' }}>
              No upcoming appointments
            </p>
          ) : (
            <div className="item-list">
              {appointments.slice(0, 3).map((appointment) => (
                <div key={appointment.id}>
                  <div className="item-title">{appointment.doctor}</div>
                  <div className="item-subtitle">
                    {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                  </div>
                  <div className="item-meta">{appointment.specialty} • {appointment.type}</div>
                </div>
              ))}
            </div>
          )}
          <button 
            className="btn" 
            style={{ width: '100%', marginTop: '16px' }}
            onClick={() => setActiveTab('appointments')}
          >
            View All Appointments
          </button>
        </div>

        <div className="card">
          <h3>Recent Vitals</h3>
          {healthData?.recentVitals ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#718096' }}>Blood Pressure</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{healthData.recentVitals.bloodPressure}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#718096' }}>Heart Rate</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{healthData.recentVitals.heartRate}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#718096' }}>Temperature</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{healthData.recentVitals.temperature}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#718096' }}>Weight</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>{healthData.recentVitals.weight}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#a0aec0', textAlign: 'center', padding: '20px' }}>
              No recent vitals recorded
            </p>
          )}
        </div>

        <div className="card">
          <h3>Current Medications</h3>
          {healthData?.medications?.length > 0 ? (
            <div className="item-list">
              {healthData.medications.map((med, index) => (
                <div key={index}>
                  <div className="item-title">{med.name}</div>
                  <div className="item-subtitle">{med.dosage} - {med.frequency}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#a0aec0', textAlign: 'center', padding: '20px' }}>
              No medications recorded
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAppointments = () => (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Your Appointments</h2>
        <button className="btn" style={{ width: 'auto' }}>
          Book New Appointment
        </button>
      </div>

      {appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
          <p>No appointments scheduled</p>
        </div>
      ) : (
        <div className="item-list">
          {appointments.map((appointment) => (
            <div key={appointment.id} style={{ padding: '20px 0', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="item-title">{appointment.doctor}</div>
                  <div className="item-subtitle">{appointment.specialty}</div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '14px', color: '#a0aec0' }}>
                    <span>📅 {new Date(appointment.date).toLocaleDateString()}</span>
                    <span>🕐 {appointment.time}</span>
                    <span>📋 {appointment.type}</span>
                  </div>
                </div>
                <span 
                  className={`status-badge status-${appointment.status === 'confirmed' ? 'normal' : 'warning'}`}
                >
                  {appointment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecords = () => (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Medical Records</h2>
        <Link to="/medical-records">
          <button className="btn" style={{ width: 'auto' }}>
            View All Records
          </button>
        </Link>
      </div>
      <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>
        Access your complete medical history, test results, and health documents.
      </p>
    </div>
  );

  const renderProfile = () => (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Profile Settings</h2>
      <div style={{ marginTop: '24px' }}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" value={user?.name || ''} readOnly />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" value={user?.email || ''} readOnly />
        </div>
        <div className="form-group">
          <label>Account Type</label>
          <input type="text" value="Patient" readOnly />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Link to="/medical-profile-setup">
            <button className="btn" style={{ width: 'auto' }}>
              Update Medical Profile
            </button>
          </Link>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>
          <div className="logo">KC</div>
          Patient Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/ai-chat">
            <button style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              🤖 AI Assistant
            </button>
          </Link>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      
      <nav className="dashboard-nav">
        <button 
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`nav-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        <button 
          className={`nav-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          Medical Records
        </button>
        <button 
          className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'appointments' && renderAppointments()}
        {activeTab === 'records' && renderRecords()}
        {activeTab === 'profile' && renderProfile()}
      </main>
    </div>
  );
};

export default PatientDashboard;