import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import teamService from '../services/teamService';

function CreateTeamPage() {
  const [teamName, setTeamName] = useState('');
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

    if (!teamName.trim()) {
      setError('Team name is required.');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('You must be logged in to create a team.');
      // Optionally redirect to login: navigate('/login');
      return;
    }

    try {
      const response = await teamService.createTeam({ name: teamName }, token);
      setMessage(`Team "${response.team.name}" created successfully!`);
      setTeamName(''); // Reset form
      // Redirect to dashboard or a 'my teams' page after a short delay
      setTimeout(() => {
        navigate('/dashboard'); // Or '/my-teams'
      }, 2000);
    } catch (err) {
      console.error('Create team error:', err);
      setError(err.message || 'Failed to create team. Please try again.');
    }
  };

  return (
    <div>
      <h2>Create New Team</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="teamName">Team Name:</label>
          <input
            type="text"
            id="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter your team name"
            required
          />
        </div>
        <button type="submit">Create Team</button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default CreateTeamPage;
