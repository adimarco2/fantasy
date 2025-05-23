'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ScoreEvents', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      match_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Matches', // Name of the table being referenced
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // If a match is deleted, its score events are also deleted
      },
      player_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Players', // Name of the table being referenced
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // If a player is deleted, their score events are also deleted
      },
      event_type: {
        type: Sequelize.STRING, // e.g., 'goal', 'assist', 'yellow_card', 'red_card', 'clean_sheet'
        allowNull: false
      },
      points_awarded: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      timestamp: {
        type: Sequelize.DATE, // Time of the event during the match
        allowNull: false
      },
      api_event_id: {
        type: Sequelize.STRING,
        allowNull: true // If the API provides a unique ID for the event
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
    await queryInterface.dropTable('ScoreEvents');
  }
};
