const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
// Optional: Add an admin role check middleware if you implement roles later
// const { isAdmin } = require('../middleware/role.middleware');

const router = express.Router();

// POST /api/admin/trigger-scoring/:besoccerMatchId
// This route is protected and requires authentication.
// For a real application, you'd also want to ensure only admins can call this.
router.post(
  '/trigger-scoring/:besoccerMatchId',
  authenticateToken, // Ensures user is logged in
  // isAdmin, // Example: Add admin role check middleware here if implemented
  adminController.triggerScoringForMatch
);

module.exports = router;
