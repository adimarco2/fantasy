'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Match extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Match.hasMany(models.ScoreEvent, {
        foreignKey: 'match_id',
        as: 'scoreEvents'
      });
    }
  }
  Match.init({
    besoccer_match_id: {
      type: DataTypes.STRING, // Can be integer too, using STRING for flexibility with API IDs
      allowNull: false,
      unique: true
    },
    home_team_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    away_team_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING, // e.g., 'scheduled', 'live', 'finished', 'postponed'
      allowNull: false
    },
    home_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    away_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    api_data: {
      type: DataTypes.JSONB,
      allowNull: true // To store the raw match data from BeSoccer API
    }
  }, {
    sequelize,
    modelName: 'Match',
    // Table name will be 'Matches' by default
  });
  return Match;
};
