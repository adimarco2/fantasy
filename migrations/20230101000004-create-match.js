'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Matches', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      besoccer_match_id: {
        type: Sequelize.STRING, // Can be integer too, using STRING for flexibility
        allowNull: false,
        unique: true
      },
      home_team_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      away_team_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING, // e.g., 'scheduled', 'live', 'finished', 'postponed'
        allowNull: false
      },
      home_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      away_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      api_data: {
        type: Sequelize.JSONB,
        allowNull: true // To store the raw match data from BeSoccer API
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Matches');
  }
};
