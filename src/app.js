require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const authRoutes = require('./routes/auth.routes'); // Import auth routes
const teamRoutes = require('./routes/team.routes'); // Import team routes
const leagueRoutes = require('./routes/league.routes'); // Import league routes
const externalRoutes = require('./routes/external.routes'); // Import external API routes
const adminRoutes = require('./routes/admin.routes'); // Import admin routes

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Mount auth routes
app.use('/api/auth', authRoutes);
// Mount team routes
app.use('/api/teams', teamRoutes);
// Mount league routes
app.use('/api/leagues', leagueRoutes);
// Mount external API routes
app.use('/api/external', externalRoutes);
// Mount admin routes
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
