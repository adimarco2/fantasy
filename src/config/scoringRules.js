// src/config/scoringRules.js
module.exports = {
  GOAL: {
    FORWARD: 5,
    MIDFIELDER: 6,
    DEFENDER: 7,
    GOALKEEPER: 10,
    DEFAULT: 5 // Fallback if position is not defined or matched
  },
  ASSIST: 3,
  YELLOW_CARD: -1,
  RED_CARD: -3,
  CLEAN_SHEET: { // Points if player's team concedes 0 goals and player played (e.g., > 60 mins)
    // Note: Clean sheet logic will be more complex as it depends on the player's team's overall performance
    // and whether the player participated for a significant duration.
    // This might be awarded per player at the end of the match processing.
    DEFENDER: 4,
    GOALKEEPER: 4,
    MIDFIELDER: 1 // Sometimes midfielders get points for clean sheets too
  },
  OWN_GOAL: -2,
  PENALTY_SAVED: 5, // For Goalkeeper
  PENALTY_MISSED: -2, // For player who missed
  // Add more rules as needed:
  // MINUTES_PLAYED_TIER_1: 1, // e.g., for playing > 60 minutes
  // MINUTES_PLAYED_TIER_2: 2, // e.g., for playing full match
};
