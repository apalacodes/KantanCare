import React, { useState, useRef, useEffect } from 'react';
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
    facilityTypes: [],
    licenseNumber: '',
    operatingDayFrom: '',
    operatingDayTo: '',
    operatingTime: '',
    latitude: '',
    longitude: '',
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

  const FACILITY_OPTIONS = ['Hospital', 'Clinic', 'Pharmacy', 'Laboratory', 'Rehabilitation', 'Telehealth', 'Private Practice', 'Community Health Center'];

  const toggleFacilityType = (type) => {
    setInstitutionData(prev => {
      const exists = prev.facilityTypes.includes(type);
      const next = exists ? prev.facilityTypes.filter(t => t !== type) : [...prev.facilityTypes, type];
      return { ...prev, facilityTypes: next };
    });
  };

  // simple day + time selection will be used for operating hours

  const handleLatLngChange = (e) => {
    const { name, value } = e.target;
    setInstitutionData(prev => ({ ...prev, [name]: value }));
  };

  // Map modal state and refs
  const [mapOpen, setMapOpen] = useState(false);
  const mapRef = useRef(null);
  const leafletLoadedRef = useRef(false);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');

  const openMap = () => {
    setMapOpen(true);
  };

  useEffect(() => {
    if (!mapOpen) return;

    const loadLeaflet = async () => {
      if (leafletLoadedRef.current) {
        initMap();
        return;
      }

      // load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // load script
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        leafletLoadedRef.current = true;
        initMap();
      };
      document.body.appendChild(script);
    };

    const initMap = () => {
      try {
        const L = window.L;
        if (!L || !mapRef.current) return;

        // clear previous map node
        mapRef.current.innerHTML = '';

        const lat = parseFloat(institutionData.latitude) || -1.2921;
        const lng = parseFloat(institutionData.longitude) || 36.8219;

        const map = L.map(mapRef.current).setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', function (e) {
          const pos = e.target.getLatLng();
          setInstitutionData(prev => ({ ...prev, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6) }));
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        map.on('click', function (e) {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setInstitutionData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
        });
      } catch (err) {
        console.error('Map init error', err);
      }
    };

    loadLeaflet();
    // lock scroll while modal open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [mapOpen]);

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`;
      const resp = await fetch(url);
      const places = await resp.json();
      console.log('geocode places', places);
      if (places && places.length > 0) {
        const p = places[0];
        const lat = parseFloat(p.lat);
        const lon = parseFloat(p.lon);
        const instName = p.display_name ? p.display_name.split(',')[0].trim() : (p.name || '');
        setInstitutionData(prev => ({ ...prev, instName, latitude: lat.toFixed(6), longitude: lon.toFixed(6) }));
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 13);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lon]);
          } else if (window.L) {
            markerRef.current = window.L.marker([lat, lon], { draggable: true }).addTo(mapInstanceRef.current);
            markerRef.current.on('dragend', function (e) {
              const pos = e.target.getLatLng();
              setInstitutionData(prev => ({ ...prev, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6) }));
            });
          }
        }
      }
    } catch (err) {
      console.error('Geocode error', err);
    }
  };

  // close modal on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMapOpen(false); };
    if (mapOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapOpen]);

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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {FACILITY_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleFacilityType(opt)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '16px',
                            border: institutionData.facilityTypes.includes(opt) ? '1px solid #2b6cb0' : '1px solid #e2e8f0',
                            background: institutionData.facilityTypes.includes(opt) ? '#ebf8ff' : 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
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
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '6px' }}>Select day</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select name="operatingDayFrom" value={institutionData.operatingDayFrom} onChange={(e) => setInstitutionData(prev => ({ ...prev, operatingDayFrom: e.target.value }))} style={{ padding: '8px', borderRadius: '6px', width: '50%' }}>
                          <option value="">From</option>
                          <option value="Mon">Mon</option>
                          <option value="Tue">Tue</option>
                          <option value="Wed">Wed</option>
                          <option value="Thu">Thu</option>
                          <option value="Fri">Fri</option>
                          <option value="Sat">Sat</option>
                          <option value="Sun">Sun</option>
                        </select>

                        <select name="operatingDayTo" value={institutionData.operatingDayTo} onChange={(e) => setInstitutionData(prev => ({ ...prev, operatingDayTo: e.target.value }))} style={{ padding: '8px', borderRadius: '6px', width: '50%' }}>
                          <option value="">To</option>
                          <option value="Mon">Mon</option>
                          <option value="Tue">Tue</option>
                          <option value="Wed">Wed</option>
                          <option value="Thu">Thu</option>
                          <option value="Fri">Fri</option>
                          <option value="Sat">Sat</option>
                          <option value="Sun">Sun</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '6px' }}>Select time</label>
                      <input type="time" value={institutionData.operatingTime} onChange={(e) => setInstitutionData(prev => ({ ...prev, operatingTime: e.target.value }))} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '100%' }} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="latitude">Latitude</label>
                    <input
                      type="text"
                      id="latitude"
                      name="latitude"
                      value={institutionData.latitude}
                      onChange={handleLatLngChange}
                      placeholder="e.g., -1.292066"
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label htmlFor="longitude">Longitude</label>
                    <input
                      type="text"
                      id="longitude"
                      name="longitude"
                      value={institutionData.longitude}
                      onChange={handleLatLngChange}
                      placeholder="e.g., 36.821945"
                    />
                  </div>

                  <div>
                    <label style={{ visibility: 'hidden' }}>pick</label>
                    <button type="button" onClick={openMap} className="btn" style={{ padding: '8px 10px' }}>Pick on map</button>
                  </div>
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
                {mapOpen && (
                  <div onClick={() => setMapOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '900px', height: '70%', background: '#fff', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#fff', zIndex: 90 }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search place or address" style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '320px' }} />
                            <button onClick={handleSearch} style={{ padding: '8px 10px', borderRadius: '6px' }}>Search</button>
                          </div>
                          <div>
                            <button onClick={() => setMapOpen(false)} style={{ padding: '8px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>Close</button>
                          </div>
                        </div>
                        <div ref={mapRef} style={{ width: '100%', flex: 1 }} />
                      </div>
                  </div>
                )}
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