// config/db.js
module.exports = {
  development: {
    username: 'your_db_user',
    password: 'your_db_password',
    database: 'fantasy_league_dev',
    host: '127.0.0.1',
    dialect: 'postgres'
  },
  test: {
    username: 'your_db_user',
    password: 'your_db_password',
    database: 'fantasy_league_test',
    host: '127.0.0.1',
    dialect: 'postgres'
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    // Add any additional production-specific options here
    // dialectOptions: {
    //   ssl: {
    //     require: true,
    //     rejectUnauthorized: false // Adjust as per your SSL certificate setup
    //   }
    // }
  }
};
