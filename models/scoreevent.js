'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ScoreEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ScoreEvent.belongsTo(models.Match, {
        foreignKey: 'match_id',
        as: 'match'
      });
      ScoreEvent.belongsTo(models.Player, {
        foreignKey: 'player_id',
        as: 'player'
      });
    }
  }
  ScoreEvent.init({
    match_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Matches', // Name of the table
        key: 'id'
      }
    },
    player_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Players', // Name of the table
        key: 'id'
      }
    },
    event_type: {
      type: DataTypes.STRING, // e.g., 'goal', 'assist', 'yellow_card', 'red_card', 'clean_sheet'
      allowNull: false
    },
    points_awarded: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE, // Time of the event during the match
      allowNull: false
    },
    api_event_id: {
      type: DataTypes.STRING,
      allowNull: true // If the API provides a unique ID for the event
    }
  }, {
    sequelize,
    modelName: 'ScoreEvent',
    // Table name will be 'ScoreEvents' by default
  });
  return ScoreEvent;
};
