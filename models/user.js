'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      User.hasMany(models.Team, {
        foreignKey: 'user_id',
        as: 'teams'
      });
      User.hasMany(models.League, { // User as admin of a League
        foreignKey: 'admin_user_id',
        as: 'AdminOfLeagues' // Changed alias from 'administeredLeagues' to 'AdminOfLeagues'
      });
    }
  }
  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'User',
    // Sequelize will automatically add createdAt and updatedAt fields
  });
  return User;
};
