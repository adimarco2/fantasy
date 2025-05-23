'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Player extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Player belongsToMany Teams (through TeamPlayer)
      Player.belongsToMany(models.Team, {
        through: 'TeamPlayer', // This will be the join table
        foreignKey: 'player_id',
        otherKey: 'team_id',
        as: 'teams'
      });
      Player.hasMany(models.ScoreEvent, {
        foreignKey: 'player_id',
        as: 'scoreEvents'
      });
    }
  }
  Player.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    real_world_team_id: {
      type: DataTypes.STRING // Assuming IDs from BeSoccer could be alphanumeric
    },
    position: {
      type: DataTypes.STRING // E.g., 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'
    },
    api_player_id: {
      type: DataTypes.STRING, // Assuming IDs from BeSoccer could be alphanumeric
      unique: true,
      allowNull: true // Could be null if player is manually added and not linked to API
    }
  }, {
    sequelize,
    modelName: 'Player',
  });
  return Player;
};
