const express = require('express');
const teamController = require('../controllers/team.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes in this file are protected and require authentication

// POST /api/teams/ - Create a new team
router.post('/', authenticateToken, teamController.createTeam);

// GET /api/teams/ - Get all teams for the authenticated user
router.get('/', authenticateToken, teamController.getUserTeams);

// POST /api/teams/:team_id/players - Add a player to a specific team
// team_id is a URL parameter
router.post('/:team_id/players', authenticateToken, teamController.addPlayerToTeam);

// DELETE /api/teams/:team_id/players/:player_id - Remove a player from a specific team
// team_id and player_id are URL parameters
router.delete('/:team_id/players/:player_id', authenticateToken, teamController.removePlayerFromTeam);

module.exports = router;
