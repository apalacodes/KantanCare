import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const MedicalProfileSetup = ({ user }) => {
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    bloodType: '',
    height: '',
    weight: '',
    allergies: '',
    medications: '',
    medicalHistory: '',
    emergencyContact: '',
    emergencyPhone: ''
  });
  const [profileType, setProfileType] = useState(() => {
    try {
      const stored = localStorage.getItem('userProfile');
      if (stored) {
        const p = JSON.parse(stored);
        // map account role to profile type: 'doctor' -> 'institution'
        return p.role === 'doctor' ? 'institution' : 'patient';
      }
    } catch (err) {
      // ignore
    }
    return 'patient';
  });
  const [institutionData, setInstitutionData] = useState({
    instName: '',
    instAddress: '',
    instCity: '',
    instCountry: '',
    instPhone: '',
    instEmail: '',
    specializations: '',
    facilityType: '',
    licenseNumber: '',
    operatingHours: '',
    website: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleInstitutionChange = (e) => {
    setInstitutionData({
      ...institutionData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      // Save either patient medical profile or institution profile
      if (profileType === 'institution') {
        console.log('Saving institution profile:', institutionData);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        localStorage.setItem('institutionProfile', JSON.stringify(institutionData));
        setSuccess('Institution profile saved successfully!');
        setTimeout(() => navigate('/doctor-dashboard'), 1200);
      } else {
        console.log('Saving medical profile:', formData);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        localStorage.setItem('medicalProfile', JSON.stringify(formData));
        setSuccess('Medical profile saved successfully!');
        setTimeout(() => navigate('/patient-dashboard'), 1200);
      }
    } catch (error) {
      console.error('Error saving medical profile:', error);
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>
          <div className="logo">KC</div>
          Medical Profile Setup
        </h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <main className="dashboard-content">
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2>Complete Your Medical Profile</h2>
          <p style={{ marginBottom: '24px', color: '#718096' }}>
            Please provide your medical information to help us serve you better.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
              <label style={{ margin: 0 }}>Profile Type:</label>
              <select value={profileType} disabled style={{ padding: '8px 10px', borderRadius: '6px' }}>
                <option value="patient">Patient</option>
                <option value="institution">Health Institution</option>
              </select>
            </div>

            {profileType === 'patient' && (
              <>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
                  <div className="form-group">
                    <label htmlFor="age">Age</label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="Your age"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="gender">Gender</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="bloodType">Blood Type</label>
                    <select
                      id="bloodType"
                      name="bloodType"
                      value={formData.bloodType}
                      onChange={handleChange}
                    >
                      <option value="">Select blood type</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="height">Height (cm)</label>
                    <input
                      type="number"
                      id="height"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      placeholder="Height in centimeters"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="weight">Weight (kg)</label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="Weight in kilograms"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="emergencyContact">Emergency Contact</label>
                    <input
                      type="text"
                      id="emergencyContact"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      placeholder="Emergency contact name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="emergencyPhone">Emergency Phone</label>
                  <input
                    type="tel"
                    id="emergencyPhone"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleChange}
                    placeholder="Emergency contact phone number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="allergies">Allergies</label>
                  <textarea
                    id="allergies"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    placeholder="List any known allergies (food, medication, environmental)"
                    rows="3"
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

                <div className="form-group">
                  <label htmlFor="medications">Current Medications</label>
                  <textarea
                    id="medications"
                    name="medications"
                    value={formData.medications}
                    onChange={handleChange}
                    placeholder="List current medications and dosages"
                    rows="3"
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

                <div className="form-group">
                  <label htmlFor="medicalHistory">Medical History</label>
                  <textarea
                    id="medicalHistory"
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleChange}
                    placeholder="Describe any significant medical history, conditions, or surgeries"
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
              </>
            )}

            {profileType === 'institution' && (
              <>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
                  <div className="form-group">
                    <label htmlFor="instName">Institution Name</label>
                    <input
                      type="text"
                      id="instName"
                      name="instName"
                      value={institutionData.instName}
                      onChange={handleInstitutionChange}
                      placeholder="e.g., City General Hospital"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="facilityType">Facility Type</label>
                    <input
                      type="text"
                      id="facilityType"
                      name="facilityType"
                      value={institutionData.facilityType}
                      onChange={handleInstitutionChange}
                      placeholder="e.g., Hospital, Clinic, Lab"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="instAddress">Address</label>
                    <input
                      type="text"
                      id="instAddress"
                      name="instAddress"
                      value={institutionData.instAddress}
                      onChange={handleInstitutionChange}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="instCity">City</label>
                    <input
                      type="text"
                      id="instCity"
                      name="instCity"
                      value={institutionData.instCity}
                      onChange={handleInstitutionChange}
                      placeholder="City"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="instCountry">Country</label>
                    <input
                      type="text"
                      id="instCountry"
                      name="instCountry"
                      value={institutionData.instCountry}
                      onChange={handleInstitutionChange}
                      placeholder="Country"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="instPhone">Contact Phone</label>
                    <input
                      type="tel"
                      id="instPhone"
                      name="instPhone"
                      value={institutionData.instPhone}
                      onChange={handleInstitutionChange}
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="instEmail">Contact Email</label>
                    <input
                      type="email"
                      id="instEmail"
                      name="instEmail"
                      value={institutionData.instEmail}
                      onChange={handleInstitutionChange}
                      placeholder="contact@hospital.org"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="specializations">Specializations</label>
                  <input
                    type="text"
                    id="specializations"
                    name="specializations"
                    value={institutionData.specializations}
                    onChange={handleInstitutionChange}
                    placeholder="Comma-separated (e.g., Cardiology, Pediatrics)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="licenseNumber">License / Reg. Number</label>
                  <input
                    type="text"
                    id="licenseNumber"
                    name="licenseNumber"
                    value={institutionData.licenseNumber}
                    onChange={handleInstitutionChange}
                    placeholder="Registration or license number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="operatingHours">Operating Hours</label>
                  <input
                    type="text"
                    id="operatingHours"
                    name="operatingHours"
                    value={institutionData.operatingHours}
                    onChange={handleInstitutionChange}
                    placeholder="e.g., Mon-Fri 08:00-17:00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="website">Website</label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={institutionData.website}
                    onChange={handleInstitutionChange}
                    placeholder="https://example.org"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={institutionData.description}
                    onChange={handleInstitutionChange}
                    placeholder="Brief description of the facility, services, or notes"
                    rows="4"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px' }}
                  />
                </div>
              </>
            )}

            {success && <div className="success">{success}</div>}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                className="btn"
                onClick={() => navigate('/patient-dashboard')}
                disabled={loading}
                style={{ width: 'auto', background: 'transparent', color: '#718096', border: '1px solid #e2e8f0' }}
              >
                Skip for Now
              </button>
              <button type="submit" className="btn" style={{ width: 'auto' }} disabled={loading}>
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default MedicalProfileSetup;