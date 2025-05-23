import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL_LEAGUES || 'http://localhost:3000/api/leagues';

// Helper to get the authorization header
const getAuthHeader = (token) => {
  if (!token) {
    // This case should ideally be handled before calling the service,
    // e.g., by redirecting to login if no token is found.
    console.warn('No token provided for API call');
    // Depending on backend setup, some public routes might not need a token.
    // For protected routes, the backend will return a 401.
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Creates a new league.
 * @param {object} leagueData - Data for the new league (e.g., { name: 'My Awesome League', settings: {} }).
 * @param {string} token - The JWT token for authentication.
 * @returns {Promise<object>} The response data from the API.
 */
const createLeague = async (leagueData, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, leagueData, getAuthHeader(token));
    return response.data;
  } catch (error) {
    console.error('Error creating league:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

/**
 * Fetches all leagues.
 * @param {string} token - The JWT token for authentication. (Assumed protected route for now)
 * @returns {Promise<Array>} A list of leagues.
 */
const getAllLeagues = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, getAuthHeader(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching all leagues:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

/**
 * Fetches details for a specific league.
 * @param {string|number} leagueId - The ID of the league.
 * @param {string} token - The JWT token for authentication.
 * @returns {Promise<object>} The league details.
 */
const getLeagueDetails = async (leagueId, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${leagueId}`, getAuthHeader(token));
    return response.data;
  } catch (error) {
    console.error(`Error fetching league details for ID ${leagueId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

/**
 * Joins a league with a specific team.
 * @param {string|number} leagueId - The ID of the league to join.
 * @param {string|number} teamId - The ID of the team to join the league with.
 * @param {string} token - The JWT token for authentication.
 * @returns {Promise<object>} The response data from the API.
 */
const joinLeague = async (leagueId, teamId, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/${leagueId}/join`, { team_id: teamId }, getAuthHeader(token));
    return response.data;
  } catch (error) {
    console.error(`Error joining league ID ${leagueId} with team ID ${teamId}:`, error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

const leagueService = {
  createLeague,
  getAllLeagues,
  getLeagueDetails,
  joinLeague
};

export default leagueService;
