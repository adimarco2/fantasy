import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import leagueService from '../services/leagueService';

function CreateLeaguePage() {
  const [leagueName, setLeagueName] = useState('');
  // const [settings, setSettings] = useState(''); // Optional: for league settings
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Placeholder for actual token retrieval
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!leagueName.trim()) {
      setError('League name is required.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('You must be logged in to create a league.');
      // Optionally redirect to login: navigate('/login');
      return;
    }

    try {
      // const leagueData = { name: leagueName, settings: settings ? JSON.parse(settings) : {} };
      // For now, only name. Settings can be a JSON string or structured object if form is more complex.
      const leagueData = { name: leagueName };
      const response = await leagueService.createLeague(leagueData, token);
      setMessage(`League "${response.league.name}" created successfully! ID: ${response.league.id}`);
      setLeagueName(''); // Reset form
      // setSettings('');
      // Redirect to the new league's detail page or leagues list
      setTimeout(() => {
        navigate(`/leagues/${response.league.id}`); // Or '/leagues'
      }, 2000);
    } catch (err) {
      console.error('Create league error:', err);
      setError(err.message || 'Failed to create league. Please try again.');
    }
  };

  return (
    <div>
      <h2>Create New League</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="leagueName">League Name:</label>
          <input
            type="text"
            id="leagueName"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="Enter league name"
            required
          />
        </div>
        {/* Optional: Textarea for settings (as JSON for simplicity) */}
        {/* 
        <div>
          <label htmlFor="settings">Settings (JSON format, optional):</label>
          <textarea
            id="settings"
            value={settings}
            onChange={(e) => setSettings(e.target.value)}
            placeholder='e.g., {"max_teams": 10, "draft_type": "snake"}'
            rows="3"
          />
        </div>
        */}
        <button type="submit">Create League</button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default CreateLeaguePage;
