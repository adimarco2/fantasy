'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Players', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      real_world_team_id: {
        type: Sequelize.STRING // Assuming IDs from BeSoccer could be alphanumeric
      },
      position: {
        type: Sequelize.STRING // E.g., 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'
      },
      api_player_id: {
        type: Sequelize.STRING, // Assuming IDs from BeSoccer could be alphanumeric
        unique: true,
        allowNull: true // Could be null if player is manually added and not linked to API
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
    await queryInterface.dropTable('Players');
  }
};
