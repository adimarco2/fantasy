'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TeamPlayer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define associations here if needed, e.g.:
      // TeamPlayer.belongsTo(models.Team, { foreignKey: 'team_id' });
      // TeamPlayer.belongsTo(models.Player, { foreignKey: 'player_id' });
    }
  }
  TeamPlayer.init({
    team_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'Teams', // Name of the table
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    player_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'Players', // Name of the table
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
    // Sequelize automatically adds createdAt and updatedAt by default.
    // If you don't want them for a join table, you can disable them:
    // timestamps: false
  }, {
    sequelize,
    modelName: 'TeamPlayer',
    // timestamps: false, // Typically, join tables don't need their own timestamps
  });
  return TeamPlayer;
};
