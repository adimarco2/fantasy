const express = require('express');
const leagueController = require('../controllers/league.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes in this file are protected and require authentication

// POST /api/leagues/ - Create a new league
router.post('/', authenticateToken, leagueController.createLeague);

// GET /api/leagues/ - Get all leagues
// (Protected for now, as per subtask instruction)
router.get('/', authenticateToken, leagueController.getAllLeagues);

// GET /api/leagues/:league_id - Get details for a specific league
router.get('/:league_id', authenticateToken, leagueController.getLeagueDetails);

// POST /api/leagues/:league_id/join - Join a league with a team
router.post('/:league_id/join', authenticateToken, leagueController.joinLeague);

module.exports = router;
