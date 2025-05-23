'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Players', [
      {
        name: 'Lionel Messi',
        real_world_team_id: 'PSG_REAL_ID', // Placeholder
        position: 'Forward',
        api_player_id: 'LM10', // Placeholder, ensure unique if constraint applies
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Cristiano Ronaldo',
        real_world_team_id: 'ALN_REAL_ID', // Placeholder
        position: 'Forward',
        api_player_id: 'CR7', // Placeholder, ensure unique if constraint applies
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Kevin De Bruyne',
        real_world_team_id: 'MCI_REAL_ID', // Placeholder
        position: 'Midfielder',
        api_player_id: 'KDB17', // Placeholder, ensure unique if constraint applies
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Virgil van Dijk',
        real_world_team_id: 'LIV_REAL_ID', // Placeholder
        position: 'Defender',
        api_player_id: 'VVD4', // Placeholder, ensure unique if constraint applies
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Players', null, {});
  }
};
