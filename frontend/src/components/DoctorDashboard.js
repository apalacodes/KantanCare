import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';

const DoctorDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    patientName: '',
    type: 'visit',
    title: '',
    date: '',
    description: ''
  });
  const navigate = useNavigate();

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <div className="card">
              <h2>Welcome, {user.name}!</h2>
              <p>Here's your practice overview for today.</p>
            </div>
            <div className="grid">
              <div className="card">
                <h3>Today's Appointments</h3>
                <p>John Doe - 10:00 AM - Follow-up</p>
                <p>Jane Smith - 11:30 AM - Check-up</p>
                <p>Mike Johnson - 2:00 PM - Consultation</p>
                <p>Sarah Wilson - 3:30 PM - Lab results review</p>
              </div>
              <div className="card">
                <h3>Pending Reviews</h3>
                <p>3 lab results awaiting review</p>
                <p>2 patient messages</p>
                <p>1 prescription renewal</p>
              </div>
              <div className="card">
                <h3>Statistics</h3>
                <p>Patients seen this week: 24</p>
                <p>Appointments scheduled: 18</p>
                <p>Active prescriptions: 45</p>
              </div>
            </div>
          </div>
        );
      case 'patients':
        return (
          <div className="card">
            <h2>Patient Management</h2>
            <p>View and manage your patient records.</p>
            <div style={{ marginTop: '2rem' }}>
              <h3>Recent Patients</h3>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                <strong>John Doe</strong> - Last visit: Jan 20, 2026
                <br />
                <small>Condition: Hypertension follow-up</small>
              </div>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                <strong>Jane Smith</strong> - Last visit: Jan 19, 2026
                <br />
                <small>Condition: Annual check-up</small>
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <button className="btn" onClick={() => setShowAddRecord(true)} style={{ marginTop: '1rem' }}>
                Add Medical Record for Patient
              </button>
            </div>
          </div>
        );
      case 'appointments':
        return (
          <div className="card">
            <h2>Appointment Schedule</h2>
            <p>Manage your appointment calendar.</p>
            <button className="btn" style={{ width: 'auto', marginTop: '1rem' }}>
              View Full Calendar
            </button>
          </div>
        );
      case 'reports':
        return (
          <div className="card">
            <h2>Medical Reports</h2>
            <p>Review lab results, imaging reports, and other medical documents.</p>
            <div style={{ marginTop: '2rem' }}>
              <h3>Pending Reports</h3>
              <p>• Blood work - John Doe (Lab ID: 12345)</p>
              <p>• X-Ray results - Jane Smith (Lab ID: 12346)</p>
              <p>• MRI scan - Mike Johnson (Lab ID: 12347)</p>
            </div>
          </div>
        );
      default:
        return null;
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

  const handleAddRecord = (e) => {
    e.preventDefault();
    // For now we add locally — integrate with backend/api later
    if (!newRecord.patientName || !newRecord.title || !newRecord.date) {
      alert('Please fill patient name, title and date');
      return;
    }

    // Here you'd call an API to save record; we'll show a success message and reset form
    alert(`Added record for ${newRecord.patientName}: ${newRecord.title}`);
    setNewRecord({ patientName: '', type: 'visit', title: '', date: '', description: '' });
    setShowAddRecord(false);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Doctor Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>
      
      <nav style={{ background: '#f8f9fa', padding: '1rem 2rem', borderBottom: '1px solid #dee2e6' }}>
        <button 
          onClick={() => setActiveTab('overview')}
          style={{ 
            marginRight: '1rem', 
            padding: '0.5rem 1rem',
            background: activeTab === 'overview' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('patients')}
          style={{ 
            marginRight: '1rem', 
            padding: '0.5rem 1rem',
            background: activeTab === 'patients' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Patients
        </button>
        <button 
          onClick={() => setActiveTab('appointments')}
          style={{ 
            marginRight: '1rem', 
            padding: '0.5rem 1rem',
            background: activeTab === 'appointments' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Appointments
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          style={{ 
            marginRight: '1rem', 
            padding: '0.5rem 1rem',
            background: activeTab === 'reports' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reports
        </button>
      </nav>

      <main className="dashboard-content">
        {renderContent()}

        {showAddRecord && (
          <div className="card" style={{ maxWidth: '700px', margin: '24px auto', position: 'relative' }}>
            <h2>Add Medical Record</h2>
            <form onSubmit={handleAddRecord}>
              <div className="form-group">
                <label>Patient Name</label>
                <input
                  type="text"
                  value={newRecord.patientName}
                  onChange={(e) => setNewRecord({...newRecord, patientName: e.target.value})}
                  placeholder="Full name of patient"
                />
              </div>

              <div className="form-group">
                <label>Record Type</label>
                <select value={newRecord.type} onChange={(e) => setNewRecord({...newRecord, type: e.target.value})}>
                  <option value="visit">Doctor Visit</option>
                  <option value="lab">Lab Result</option>
                  <option value="imaging">Imaging</option>
                  <option value="prescription">Prescription</option>
                </select>
              </div>

              <div className="form-group">
                <label>Title</label>
                <input type="text" value={newRecord.title} onChange={(e) => setNewRecord({...newRecord, title: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input type="date" value={newRecord.date} onChange={(e) => setNewRecord({...newRecord, date: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea rows={4} value={newRecord.description} onChange={(e) => setNewRecord({...newRecord, description: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button className="btn" type="submit">Add Record</button>
                <button className="btn" type="button" onClick={() => setShowAddRecord(false)} style={{ background: '#e2e8f0', color: '#1a202c' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;