import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getMedicalRecords, uploadMedicalRecord } from '../services/api';

const MedicalRecords = ({ user }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('records');
  const [newRecord, setNewRecord] = useState({
    type: 'lab',
    title: '',
    date: '',
    description: '',
    provider: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadMedicalRecords();
  }, []);

  const loadMedicalRecords = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockRecords = [
        {
          id: 1,
          type: 'lab',
          title: 'Complete Blood Count',
          date: '2026-01-15',
          provider: 'City Medical Lab',
          description: 'Routine blood work showing normal values across all parameters.',
          status: 'normal'
        },
        {
          id: 2,
          type: 'imaging',
          title: 'Chest X-Ray',
          date: '2026-01-10',
          provider: 'General Hospital Radiology',
          description: 'Clear chest X-ray with no abnormal findings.',
          status: 'normal'
        },
        {
          id: 3,
          type: 'visit',
          title: 'Annual Physical Exam',
          date: '2026-01-05',
          provider: 'Dr. Sarah Johnson',
          description: 'Comprehensive physical examination. Patient in good health.',
          status: 'normal'
        },
        {
          id: 4,
          type: 'lab',
          title: 'Lipid Panel',
          date: '2025-12-20',
          provider: 'City Medical Lab',
          description: 'Cholesterol levels slightly elevated. Dietary changes recommended.',
          status: 'warning'
        }
      ];
      
      setRecords(mockRecords);
    } catch (error) {
      console.error('Error loading medical records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newRecord.title || !newRecord.date) {
      alert('Please fill in the title and date');
      return;
    }

    try {
      setUploading(true);
      
      const recordToAdd = {
        ...newRecord,
        id: Date.now(),
        status: 'normal'
      };
      
      setRecords(prev => [recordToAdd, ...prev]);
      setNewRecord({
        type: 'lab',
        title: '',
        date: '',
        description: '',
        provider: ''
      });
      
      alert('Medical record added successfully!');
    } catch (error) {
      console.error('Error uploading record:', error);
      alert('Failed to add medical record');
    } finally {
      setUploading(false);
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

  const getRecordIcon = (type) => {
    switch (type) {
      case 'lab': return '🧪';
      case 'imaging': return '🏥';
      case 'visit': return '👩‍⚕️';
      case 'prescription': return '💊';
      default: return '📄';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading medical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>
          <div className="logo">KC</div>
          Medical Records
        </h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={`nav-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          View Records
        </button>
        <button 
          className={`nav-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Add Record
        </button>
        <button 
          className={`nav-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Health Summary
        </button>
      </nav>

      <main className="dashboard-content">
        {activeTab === 'records' && (
          <div>
            <div className="card">
              <h2>Your Medical Records</h2>
              <p style={{ color: '#718096', marginBottom: '24px' }}>
                View and manage all your medical records in one place.
              </p>

              {records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                  <p>No medical records found.</p>
                  <button 
                    className="btn" 
                    style={{ width: 'auto', marginTop: '16px' }}
                    onClick={() => setActiveTab('upload')}
                  >
                    Add Your First Record
                  </button>
                </div>
              ) : (
                <div className="item-list">
                  {records.map((record) => (
                    <div key={record.id} style={{ padding: '20px 0', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{getRecordIcon(record.type)}</span>
                            <h3 className="item-title">{record.title}</h3>
                            <span 
                              className="status-badge"
                              style={{ 
                                backgroundColor: `${getStatusColor(record.status)}20`,
                                color: getStatusColor(record.status)
                              }}
                            >
                              {record.status}
                            </span>
                          </div>
                          <p className="item-subtitle">{record.description}</p>
                          <div style={{ marginTop: '8px', display: 'flex', gap: '16px', fontSize: '14px', color: '#a0aec0' }}>
                            <span>📅 {new Date(record.date).toLocaleDateString()}</span>
                            <span>🏥 {record.provider}</span>
                          </div>
                        </div>
                        <button
                          style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#667eea'
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2>Add Medical Record</h2>
            <p style={{ color: '#718096', marginBottom: '24px' }}>
              Upload a new medical record or test result.
            </p>

            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label htmlFor="type">Record Type</label>
                <select
                  id="type"
                  name="type"
                  value={newRecord.type}
                  onChange={(e) => setNewRecord({...newRecord, type: e.target.value})}
                >
                  <option value="lab">Lab Result</option>
                  <option value="imaging">Imaging/X-Ray</option>
                  <option value="visit">Doctor Visit</option>
                  <option value="prescription">Prescription</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  value={newRecord.title}
                  onChange={(e) => setNewRecord({...newRecord, title: e.target.value})}
                  placeholder="e.g., Blood Test Results"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  type="date"
                  id="date"
                  value={newRecord.date}
                  onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="provider">Healthcare Provider</label>
                <input
                  type="text"
                  id="provider"
                  value={newRecord.provider}
                  onChange={(e) => setNewRecord({...newRecord, provider: e.target.value})}
                  placeholder="e.g., City Medical Center"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={newRecord.description}
                  onChange={(e) => setNewRecord({...newRecord, description: e.target.value})}
                  placeholder="Brief description of the record or results"
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button type="submit" className="btn" disabled={uploading}>
                {uploading ? 'Adding Record...' : 'Add Record'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'summary' && (
          <div>
            <div className="card">
              <h2>Health Summary</h2>
              <p style={{ color: '#718096', marginBottom: '24px' }}>
                Overview of your recent health metrics and trends.
              </p>

              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">{records.length}</span>
                  <span className="stat-label">Total Records</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{records.filter(r => r.status === 'normal').length}</span>
                  <span className="stat-label">Normal Results</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{records.filter(r => r.status === 'warning').length}</span>
                  <span className="stat-label">Needs Attention</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">
                    {records.length > 0 ? new Date(records[0].date).toLocaleDateString() : 'N/A'}
                  </span>
                  <span className="stat-label">Last Record</span>
                </div>
              </div>

              <div style={{ marginTop: '32px' }}>
                <h3 style={{ marginBottom: '16px' }}>Recent Activity</h3>
                <div className="item-list">
                  {records.slice(0, 3).map((record) => (
                    <div key={record.id}>
                      <div className="item-title">{record.title}</div>
                      <div className="item-subtitle">{new Date(record.date).toLocaleDateString()} - {record.provider}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MedicalRecords;