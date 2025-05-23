import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/teams';

// Helper to get the authorization header
const getAuthHeader = (token) => {
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

/**
 * Creates a new team.
 * @param {object} teamData - Data for the new team (e.g., { name: 'My New Team', league_id: 1 (optional) }).
 * @param {string} token - The JWT token for authentication.
 * @returns {Promise<object>} The response data from the API.
 */
const createTeam = async (teamData, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/`, teamData, getAuthHeader(token));
    return response.data;
  } catch (error) {
    console.error('Error creating team:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

/**
 * Fetches all teams for the authenticated user.
 * @param {string} token - The JWT token for authentication.
 * @returns {Promise<Array>} A list of the user's teams.
 */
const getUserTeams = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/`, getAuthHeader(token));
    return response.data;
  } catch (error) {
    console.error('Error fetching user teams:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

/**
 * Adds a player to a specific team.
 * @param {string|number} teamId - The ID of the team.
 * @param {string|number} playerId - The ID of the player to add.
 * @param {string} token - The JWT token for authentication.
 * @returns {Promise<object>} The response data from the API.
 */
const addPlayerToTeam = async (teamId, playerId, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/${teamId}/players`, { player_id: playerId }, getAuthHeader(token));
    return response.data;
  } catch (error) {
    console.error('Error adding player to team:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

/**
 * Removes a player from a specific team.
 * @param {string|number} teamId - The ID of the team.
 * @param {string|number} playerId - The ID of the player to remove.
 * @param {string} token - The JWT token for authentication.
 *   @returns {Promise<object>} The response data from the API.
 */
const removePlayerFromTeam = async (teamId, playerId, token) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/${teamId}/players/${playerId}`, getAuthHeader(token));
    return response.data;
  } catch (error) {
    console.error('Error removing player from team:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server is unreachable');
  }
};

const teamService = {
  createTeam,
  getUserTeams,
  addPlayerToTeam,
  removePlayerFromTeam
};

export default teamService;
