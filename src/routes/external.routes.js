const express = require('express');
const externalController = require('../controllers/external.controller');
// No authentication middleware here, as these are proxying to an external API
// which should have its own authentication (the API key in the service).

const router = express.Router();

// GET /api/external/players - Fetch players from BeSoccer
// Query params: leagueId, teamId (placeholders, adjust as needed)
router.get('/players', externalController.getPlayers);

// GET /api/external/matches - Fetch matches from BeSoccer
// Query params: leagueId, dateFrom, dateTo (placeholders, adjust as needed)
router.get('/matches', externalController.getMatches);

// GET /api/external/matches/:besoccerMatchId - Fetch specific match details
router.get('/matches/:besoccerMatchId', externalController.getMatchDetails);

module.exports = router;
