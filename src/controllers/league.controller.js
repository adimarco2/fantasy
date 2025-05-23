const { League, User, Team } = require('../models'); // Assuming models/index.js exports these
const { Op } = require('sequelize');

/**
 * Creates a new league.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createLeague = async (req, res) => {
  try {
    const { name, settings } = req.body;
    const admin_user_id = req.user.id; // From authenticateToken middleware

    if (!name) {
      return res.status(400).json({ message: 'League name is required.' });
    }

    const newLeague = await League.create({
      name,
      admin_user_id,
      settings: settings || {} // Default to empty object if settings not provided
    });

    res.status(201).json({
      message: 'League created successfully',
      league: newLeague
    });

  } catch (error) {
    console.error('Create league error:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ message: 'Validation error', errors: messages });
    }
    // Handle potential unique constraint errors if league names must be unique
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'League name already exists.', errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Internal server error during league creation.' });
  }
};

/**
 * Gets all leagues.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getAllLeagues = async (req, res) => {
  try {
    const leagues = await League.findAll({
      include: [
        {
          model: User,
          as: 'Admin', // Must match the alias in League.belongsTo(User)
          attributes: ['id', 'username']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(leagues);

  } catch (error) {
    console.error('Get all leagues error:', error);
    res.status(500).json({ message: 'Internal server error while fetching leagues.' });
  }
};

/**
 * Gets details for a specific league, including its teams and their owners.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getLeagueDetails = async (req, res) => {
  try {
    const { league_id } = req.params;

    const league = await League.findByPk(league_id, {
      include: [
        {
          model: User,
          as: 'Admin', // Alias for the admin user
          attributes: ['id', 'username']
        },
        {
          model: Team,
          as: 'teams', // Alias for teams in the league (from League.hasMany(Team, {as: 'teams'}))
          attributes: ['id', 'name', 'total_score'],
          include: [
            {
              model: User,
              as: 'user', // Alias for the team owner (from Team.belongsTo(User, {as: 'user'}))
              attributes: ['id', 'username']
            }
          ]
        }
      ]
    });

    if (!league) {
      return res.status(404).json({ message: `League with ID ${league_id} not found.` });
    }

    res.status(200).json(league);

  } catch (error) {
    console.error(`Get league details error for league ID ${req.params.league_id}:`, error);
    res.status(500).json({ message: 'Internal server error while fetching league details.' });
  }
};


/**
 * Allows an authenticated user to join a league with one of their eligible teams.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const joinLeague = async (req, res) => {
  try {
    const { league_id } = req.params;
    const { team_id } = req.body;
    const user_id = req.user.id; // From authenticateToken middleware

    if (!team_id) {
      return res.status(400).json({ message: 'Team ID is required to join a league.' });
    }
    if (!league_id) {
        return res.status(400).json({ message: 'League ID is required in URL parameters.' });
    }

    // 1. Check if the league exists
    const league = await League.findByPk(league_id);
    if (!league) {
      return res.status(404).json({ message: `League with ID ${league_id} not found.` });
    }

    // 2. Verify the team exists, belongs to the user, and is not already in a league
    const team = await Team.findOne({
      where: {
        id: team_id,
        user_id: user_id,
      }
    });

    if (!team) {
      return res.status(404).json({ message: `Team with ID ${team_id} not found or does not belong to you.` });
    }

    if (team.league_id !== null) {
        if (team.league_id === parseInt(league_id, 10)) {
            return res.status(409).json({ message: `Team ${team.name} is already in this league.` });
        }
        return res.status(409).json({ message: `Team ${team.name} (ID: ${team_id}) already belongs to another league (ID: ${team.league_id}).` });
    }


    // 3. Update the team's league_id
    await team.update({ league_id: parseInt(league_id, 10) });

    res.status(200).json({
      message: `Team ${team.name} (ID: ${team_id}) successfully joined league ${league.name} (ID: ${league_id})`,
      team: team // Send back the updated team data
    });

  } catch (error) {
    console.error('Join league error:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ message: 'Validation error during join league.', errors: messages });
    }
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        // This might happen if league_id is somehow invalid despite prior checks
        return res.status(400).json({ message: 'Invalid league ID or team ID provided for joining.', detail: error.message });
    }
    res.status(500).json({ message: 'Internal server error during join league operation.' });
  }
};


module.exports = {
  createLeague,
  getAllLeagues,
  getLeagueDetails,
  joinLeague
};
