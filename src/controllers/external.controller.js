const besoccerService = require('../services/besoccer.service');

/**
 * Fetches players from BeSoccer API via the service.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getPlayers = async (req, res) => {
  try {
    // These query params are placeholders, adjust based on actual BeSoccer API capabilities
    const { leagueId, teamId } = req.query; 
    
    // Basic validation (optional, can be more sophisticated)
    // if (!leagueId) {
    //   return res.status(400).json({ message: 'leagueId query parameter is required.' });
    // }

    const players = await besoccerService.fetchPlayers(leagueId, teamId);
    res.status(200).json(players);
  } catch (error) {
    console.error('Error in getPlayers controller:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch players from external API.' });
  }
};

/**
 * Fetches matches from BeSoccer API via the service.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getMatches = async (req, res) => {
  try {
    // These query params are placeholders
    const { leagueId, dateFrom, dateTo } = req.query;

    // if (!leagueId || !dateFrom || !dateTo) {
    //   return res.status(400).json({ message: 'leagueId, dateFrom, and dateTo query parameters are required.' });
    // }
    
    const matches = await besoccerService.fetchMatches(leagueId, dateFrom, dateTo);
    res.status(200).json(matches);
  } catch (error) {
    console.error('Error in getMatches controller:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch matches from external API.' });
  }
};

/**
 * Fetches match details from BeSoccer API via the service.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getMatchDetails = async (req, res) => {
  try {
    const { besoccerMatchId } = req.params; // Get ID from URL parameter

    if (!besoccerMatchId) {
      return res.status(400).json({ message: 'BeSoccer Match ID is required in URL parameters.' });
    }

    const matchDetails = await besoccerService.fetchMatchDetails(besoccerMatchId);
    res.status(200).json(matchDetails);
  } catch (error) {
    console.error('Error in getMatchDetails controller:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch match details from external API.' });
  }
};

module.exports = {
  getPlayers,
  getMatches,
  getMatchDetails
};
