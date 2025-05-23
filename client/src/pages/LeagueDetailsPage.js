import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import leagueService from '../services/leagueService';
import teamService from '../services/teamService'; // To fetch user's teams
import { POLLING_INTERVAL_LEAGUE_DETAILS } from '../config'; // Import configuration

function LeagueDetailsPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [eligibleTeams, setEligibleTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Placeholder for actual token retrieval
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  const fetchLeagueDetails = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Please log in to view league details.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const details = await leagueService.getLeagueDetails(leagueId, token);
      setLeague(details);

      // Fetch user's teams to determine eligibility for joining
      const teamsData = await teamService.getUserTeams(token);
      setUserTeams(teamsData || []);

      // Determine eligible teams (not already in any league)
      // and not already in *this* league (though backend should prevent this second case)
      const currentTeamIdsInLeague = details.teams ? details.teams.map(t => t.id) : [];
      const eligible = (teamsData || []).filter(team => 
        !team.league_id && !currentTeamIdsInLeague.includes(team.id)
      );
      setEligibleTeams(eligible);
      if (eligible.length > 0) {
        setSelectedTeamId(eligible[0].id); // Default to first eligible team
      }

    } catch (err) {
      console.error('Fetch league details error:', err);
      setError(err.message || `Failed to fetch details for league ID ${leagueId}.`);
      setLeague(null);
    } finally {
      setLoading(false);
    }
  // }, [leagueId]); // Original: fetchLeagueDetails is not added to dependency array to avoid resetting interval on every state change by fetchLeagueDetails itself.
  // Corrected: fetchLeagueDetails should be stable due to useCallback, leagueId is the true dependency for re-running the fetch logic.
  }, [leagueId]);


  useEffect(() => {
    fetchLeagueDetails(); // Initial fetch

    const intervalId = setInterval(() => {
      console.log(`Polling league details for league ID: ${leagueId}`);
      // We don't set loading to true for polling updates to make them less intrusive
      // Error handling within fetchLeagueDetails should manage individual poll errors
      fetchLeagueDetails().catch(err => {
        // Log polling errors but don't necessarily set a page-level error state
        // that might overwrite a more critical initial load error.
        console.error('Error during polling league details:', err.message);
        // Optionally, if specific error codes indicate auth failure, could stop polling.
      });
    }, POLLING_INTERVAL_LEAGUE_DETAILS); // Use configured interval

    return () => {
      clearInterval(intervalId); // Cleanup interval on component unmount
      console.log(`Polling stopped for league ID: ${leagueId}`);
    };
  // }, [fetchLeagueDetails, leagueId]); // Original: Rerun effect if leagueId changes, or fetchLeagueDetails definition changes (though it shouldn't often)
  // Corrected: fetchLeagueDetails is stable due to useCallback, so only leagueId is needed here if fetchLeagueDetails doesn't change.
  // However, if fetchLeagueDetails itself *could* change (e.g. if it depended on other state/props), then it should be included.
  // For this case, keeping fetchLeagueDetails in the dependency array is safer if its definition might change based on other factors not shown.
  }, [fetchLeagueDetails, leagueId]); 

  const handleJoinLeague = async () => {
    const token = getAuthToken();
    if (!token) {
      setJoinError('Authentication token not found. Please log in.');
      return;
    }
    if (!selectedTeamId) {
      setJoinError('Please select a team to join the league.');
      return;
    }
    setJoinError('');
    setJoinSuccess('');

    try {
      const response = await leagueService.joinLeague(leagueId, selectedTeamId, token);
      setJoinSuccess(response.message || `Team successfully joined league!`);
      // Refresh league details to show the new team
      fetchLeagueDetails();
      // Disable the join button or selected team option if it's now in the league
      setEligibleTeams(prev => prev.filter(team => team.id !== parseInt(selectedTeamId)));
      if (eligibleTeams.length <=1) setSelectedTeamId(''); // Reset if no more eligible teams

    } catch (err) {
      console.error('Join league error:', err);
      setJoinError(err.message || 'Failed to join league.');
    }
  };
  
  const handleTeamSelectionChange = (e) => {
    setSelectedTeamId(e.target.value);
  };

  if (loading) return <p>Loading league details...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!league) return <p>League not found.</p>;

  return (
    <div>
      <h2>{league.name} (ID: {league.id})</h2>
      <p>Admin: {league.Admin ? league.Admin.username : 'N/A'}</p>
      {league.settings && <pre>Settings: {JSON.stringify(league.settings, null, 2)}</pre>}
      
      <h3>Teams in this League:</h3>
      {league.teams && league.teams.length > 0 ? (
        <ul>
          {league.teams.map(team => (
            <li key={team.id}>
              {team.name} (ID: {team.id}) - Owner: {team.user ? team.user.username : 'N/A'} - Score: {team.total_score}
            </li>
          ))}
        </ul>
      ) : (
        <p>No teams have joined this league yet.</p>
      )}

      <hr />

      <h3>Join this League</h3>
      {eligibleTeams.length > 0 ? (
        <div>
          <label htmlFor="teamSelect">Select one of your teams to join:</label>
          <select id="teamSelect" value={selectedTeamId} onChange={handleTeamSelectionChange}>
            {eligibleTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name} (ID: {team.id})
              </option>
            ))}
          </select>
          <button onClick={handleJoinLeague} disabled={!selectedTeamId} style={{ marginLeft: '10px' }}>
            Join League with Selected Team
          </button>
        </div>
      ) : (
        <p>You have no teams eligible to join this league. (Either all your teams are in a league, or you have no teams created).</p>
      )}
      {joinSuccess && <p style={{ color: 'green' }}>{joinSuccess}</p>}
      {joinError && <p style={{ color: 'red' }}>Error joining: {joinError}</p>}
    </div>
  );
}

export default LeagueDetailsPage;
