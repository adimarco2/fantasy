import React, { useState, useEffect, useCallback } from 'react';
import teamService from '../services/teamService';
import { Link } from 'react-router-dom'; // For "Create Team" link if no teams

function MyTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addPlayerForms, setAddPlayerForms] = useState({}); // { teamId: playerId }

  // Placeholder for actual token retrieval
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  const fetchUserTeams = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Please log in to view your teams.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const userTeams = await teamService.getUserTeams(token);
      setTeams(userTeams || []); // Ensure teams is always an array
    } catch (err) {
      console.error('Fetch teams error:', err);
      setError(err.message || 'Failed to fetch teams.');
      setTeams([]); // Ensure teams is an array on error
    } finally {
      setLoading(false);
    }
import { POLLING_INTERVAL_USER_TEAMS } from '../config'; // Import configuration

// ... (Keep the rest of the imports: React, Link)
// ... (Keep the service import: teamService)

function MyTeamsPage() {
  // ... (Keep existing state: teams, loading, error, addPlayerForms)
  // ... (Keep existing getAuthToken function)

  const fetchUserTeams = useCallback(async () => {
    // ... (Keep existing fetchUserTeams logic)
  }, []);

  useEffect(() => {
    fetchUserTeams(); // Initial fetch

    const intervalId = setInterval(() => {
      console.log('Polling user teams...');
      fetchUserTeams().catch(err => {
        console.error('Error during polling user teams:', err.message);
      });
    }, POLLING_INTERVAL_USER_TEAMS); // Use configured interval

    return () => {
      clearInterval(intervalId); // Cleanup interval on component unmount
      console.log('Polling stopped for user teams.');
    };
  }, [fetchUserTeams]); // Rerun effect if fetchUserTeams definition changes (though it shouldn't often)

  const handleAddPlayerInputChange = (teamId, value) => {
    setAddPlayerForms(prev => ({ ...prev, [teamId]: value }));
  };

  const handleAddPlayer = async (teamId) => {
    const token = getAuthToken();
    const playerId = addPlayerForms[teamId];

    if (!playerId || !playerId.trim()) {
      setError(`Please enter a Player ID for team ${teamId}.`);
      return;
    }
    if (!token) {
      setError('Authentication token not found. Please log in.');
      return;
    }

    try {
      setError('');
      await teamService.addPlayerToTeam(teamId, playerId, token);
      setAddPlayerForms(prev => ({ ...prev, [teamId]: '' })); // Clear input
      fetchUserTeams(); // Refresh teams list
      alert(`Player ${playerId} request to add to team ${teamId} sent.`);
    } catch (err) {
      console.error(`Error adding player ${playerId} to team ${teamId}:`, err);
      setError(err.message || `Failed to add player ${playerId} to team ${teamId}.`);
    }
  };

  const handleRemovePlayer = async (teamId, playerId) => {
    const token = getAuthToken();
    if (!token) {
      setError('Authentication token not found. Please log in.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove player ${playerId} from team ${teamId}?`)) {
        return;
    }

    try {
      setError('');
      await teamService.removePlayerFromTeam(teamId, playerId, token);
      fetchUserTeams(); // Refresh teams list
      alert(`Player ${playerId} removed from team ${teamId}.`);
    } catch (err) {
      console.error(`Error removing player ${playerId} from team ${teamId}:`, err);
      setError(err.message || `Failed to remove player ${playerId} from team ${teamId}.`);
    }
  };

  if (loading) return <p>Loading teams...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <h2>My Teams</h2>
      {teams.length === 0 && !loading && (
        <p>
          You don't have any teams yet. <Link to="/create-team">Create one now!</Link>
        </p>
      )}
      {teams.map(team => (
        <div key={team.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <h3>{team.name} (ID: {team.id})</h3>
          {team.league ? (
            <p>League: <Link to={`/leagues/${team.league.id}`}>{team.league.name}</Link> (ID: {team.league.id})</p>
          ) : (
            <p>Not currently in a league. <Link to="/leagues">Join a league?</Link></p>
          )}
          <p>Total Score: {team.total_score}</p>
          <h4>Players:</h4>
          {team.players && team.players.length > 0 ? (
            <ul>
              {team.players.map(player => (
                <li key={player.id}>
                  {player.name} (ID: {player.id}, Position: {player.position})
                  <button onClick={() => handleRemovePlayer(team.id, player.id)} style={{ marginLeft: '10px' }}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No players in this team yet.</p>
          )}
          <div>
            <input
              type="text"
              value={addPlayerForms[team.id] || ''}
              onChange={(e) => handleAddPlayerInputChange(team.id, e.target.value)}
              placeholder="Enter Player ID to add"
            />
            <button onClick={() => handleAddPlayer(team.id)}>Add Player</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MyTeamsPage;
