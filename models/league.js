'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class League extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      League.belongsTo(models.User, {
        foreignKey: 'admin_user_id',
        as: 'Admin' // Changed alias from 'admin' to 'Admin'
      });
      League.hasMany(models.Team, {
        foreignKey: 'league_id',
        as: 'teams'
      });
    }
  }
  League.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    admin_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // Name of the table
        key: 'id'
      }
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'League',
  });
  return League;
};
