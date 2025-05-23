'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Team extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Team.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      Team.belongsTo(models.League, {
        foreignKey: 'league_id',
        as: 'league'
      });
      // Team belongsToMany Players (through TeamPlayer)
      Team.belongsToMany(models.Player, {
        through: 'TeamPlayer', // This will be the join table
        foreignKey: 'team_id',
        otherKey: 'player_id',
        as: 'players'
      });
    }
  }
  Team.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // Name of the table
        key: 'id'
      }
    },
    league_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Leagues', // Name of the table
        key: 'id'
      }
    },
    total_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
    // players_list is omitted as per subtask instructions, will use a join table TeamPlayer
  }, {
    sequelize,
    modelName: 'Team',
  });
  return Team;
};
