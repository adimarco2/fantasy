const { Team, Player, TeamPlayer, League } = require('../models'); // Assuming models/index.js exports these
const { Op } = require('sequelize');

/**
 * Creates a new team for the authenticated user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createTeam = async (req, res) => {
  try {
    const { name, league_id } = req.body; // league_id is optional for now, can be added later
    const user_id = req.user.id; // From authenticateToken middleware

    if (!name) {
      return res.status(400).json({ message: 'Team name is required.' });
    }

    // Optional: Check if league_id is provided and if the league exists
    if (league_id) {
      const league = await League.findByPk(league_id);
      if (!league) {
        return res.status(404).json({ message: `League with ID ${league_id} not found.` });
      }
      // Potentially check if user is allowed to add team to this league (e.g. member of league)
    }


    const newTeam = await Team.create({
      name,
      user_id,
      league_id: league_id || null, // Set league_id if provided
      total_score: 0
    });

    res.status(201).json({
      message: 'Team created successfully',
      team: newTeam
    });

  } catch (error) {
    console.error('Create team error:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ message: 'Validation error', errors: messages });
    }
    // Handle potential unique constraint errors if team names must be unique per user/league
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Team name already exists for this user or league.', errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Internal server error during team creation.' });
  }
};

/**
 * Gets all teams for the authenticated user, including their players.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getUserTeams = async (req, res) => {
  try {
    const user_id = req.user.id;

    const teams = await Team.findAll({
      where: { user_id },
      include: [
        {
          model: Player,
          as: 'players', // Must match the 'as' alias in Team.belongsToMany(Player)
          attributes: ['id', 'name', 'position', 'api_player_id'], // Specify attributes to include for players
          through: {
            attributes: [] // Do not include attributes from the join table (TeamPlayer)
          }
        },
        {
            model: League,
            as: 'league', // Must match the 'as' alias in Team.belongsTo(League)
            attributes: ['id', 'name'] // Specify attributes for the league
        }
      ],
      order: [['createdAt', 'DESC']] // Optional: order teams by creation date
    });

    if (!teams || teams.length === 0) {
      return res.status(200).json([]); // Return empty array if no teams found
    }

    res.status(200).json(teams);

  } catch (error) {
    console.error('Get user teams error:', error);
    res.status(500).json({ message: 'Internal server error while fetching teams.' });
  }
};


/**
 * Adds a player to a specific team.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const addPlayerToTeam = async (req, res) => {
  try {
    const { player_id } = req.body;
    const { team_id } = req.params; // Get team_id from URL parameters
    const user_id = req.user.id;

    if (!player_id) {
      return res.status(400).json({ message: 'Player ID is required.' });
    }
    if (!team_id) {
      return res.status(400).json({ message: 'Team ID is required in URL parameters.' });
    }

    // 1. Verify team exists and belongs to the user
    const team = await Team.findOne({ where: { id: team_id, user_id } });
    if (!team) {
      return res.status(404).json({ message: `Team with ID ${team_id} not found or you do not have permission to modify it.` });
    }

    // 2. Check if player exists
    const player = await Player.findByPk(player_id);
    if (!player) {
      return res.status(404).json({ message: `Player with ID ${player_id} not found.` });
    }

    // 3. Add player to team (create entry in TeamPlayer)
    // The primary key constraint on TeamPlayer (team_id, player_id) will prevent duplicates
    const [teamPlayer, created] = await TeamPlayer.findOrCreate({
      where: { team_id: parseInt(team_id, 10), player_id: parseInt(player_id, 10) },
      defaults: { team_id: parseInt(team_id, 10), player_id: parseInt(player_id, 10) }
    });

    if (!created) {
      return res.status(409).json({ message: `Player with ID ${player_id} is already in team ${team_id}.` });
    }

    res.status(201).json({
      message: `Player ${player.name} (ID: ${player_id}) added to team ${team.name} (ID: ${team_id})`,
      teamPlayer
    });

  } catch (error) {
    console.error('Add player to team error:', error);
     if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ message: 'Invalid team_id or player_id provided.', detail: error.message });
    }
    res.status(500).json({ message: 'Internal server error while adding player to team.' });
  }
};

/**
 * Removes a player from a specific team.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const removePlayerFromTeam = async (req, res) => {
  try {
    const { team_id, player_id } = req.params; // Get from URL parameters
    const user_id = req.user.id;

    if (!team_id || !player_id) {
      return res.status(400).json({ message: 'Team ID and Player ID are required in URL parameters.' });
    }

    // 1. Verify team exists and belongs to the user
    const team = await Team.findOne({ where: { id: team_id, user_id } });
    if (!team) {
      return res.status(404).json({ message: `Team with ID ${team_id} not found or you do not have permission to modify it.` });
    }
    
    // 2. Check if player exists (optional, but good for a clear message)
    const player = await Player.findByPk(player_id);
    if (!player) {
        return res.status(404).json({ message: `Player with ID ${player_id} not found.` });
    }

    // 3. Remove player from team (delete entry from TeamPlayer)
    const result = await TeamPlayer.destroy({
      where: {
        team_id: parseInt(team_id, 10),
        player_id: parseInt(player_id, 10)
      }
    });

    if (result === 0) {
      return res.status(404).json({ message: `Player with ID ${player_id} not found in team ${team_id}.` });
    }

    res.status(200).json({ message: `Player ${player.name} (ID: ${player_id}) removed from team ${team.name} (ID: ${team_id})` });

  } catch (error) {
    console.error('Remove player from team error:', error);
    res.status(500).json({ message: 'Internal server error while removing player from team.' });
  }
};


module.exports = {
  createTeam,
  getUserTeams,
  addPlayerToTeam,
  removePlayerFromTeam
};
