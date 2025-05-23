import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import leagueService from '../services/leagueService';

function LeaguesListPage() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Placeholder for actual token retrieval
  const getAuthToken = () => {
    return localStorage.getItem('authToken');
  };

  const fetchAllLeagues = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setError('Please log in to view leagues.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const allLeagues = await leagueService.getAllLeagues(token);
      setLeagues(allLeagues || []); // Ensure leagues is always an array
    } catch (err) {
      console.error('Fetch all leagues error:', err);
      setError(err.message || 'Failed to fetch leagues.');
      setLeagues([]); // Ensure leagues is an array on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLeagues();
  }, [fetchAllLeagues]);

  if (loading) return <p>Loading leagues...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div>
      <h2>Available Leagues</h2>
      <Link to="/leagues/create" style={{ marginBottom: '20px', display: 'inline-block' }}>
        Create New League
      </Link>
      {leagues.length === 0 && !loading && (
        <p>No leagues available at the moment. Why not create one?</p>
      )}
      {leagues.map(league => (
        <div key={league.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <h3>{league.name} (ID: {league.id})</h3>
          <p>Admin: {league.Admin ? league.Admin.username : 'N/A'} (Admin ID: {league.admin_user_id})</p>
          {/* Optional: Display some settings if available league.settings */}
          <Link to={`/leagues/${league.id}`}>View Details</Link>
          {/* 
            Optional "Join League" button can be added here.
            This would require fetching user's teams and checking eligibility.
            For simplicity, joining will be primarily from LeagueDetailsPage for now.
          */}
        </div>
      ))}
    </div>
  );
}

export default LeaguesListPage;
