const { Op } = require('sequelize');
const { Match, Player, ScoreEvent, Team, TeamPlayer, sequelize } = require('../models'); // Assuming models/index.js exports these
const besoccerService = require('./besoccer.service');
const scoringRules = require('../config/scoringRules');

/**
 * Finds an existing Match by its besoccerMatchId or creates a new one.
 * @param {string} besoccerMatchId - The unique ID from BeSoccer API.
 * @param {object} matchDataFromApi - Data fetched from BeSoccer API for this match.
 * @returns {Promise<Match>} The found or created Match instance.
 */
const findOrCreateMatchByApiId = async (besoccerMatchId, matchDataFromApi) => {
  let match = await Match.findOne({ where: { besoccer_match_id: besoccerMatchId } });

  if (!match) {
    match = await Match.create({
      besoccer_match_id: besoccerMatchId,
      home_team_name: matchDataFromApi.home_team_name,
      away_team_name: matchDataFromApi.away_team_name,
      start_time: new Date(matchDataFromApi.start_time),
      status: matchDataFromApi.status, // 'scheduled', 'live', 'finished', etc.
      home_score: matchDataFromApi.home_score || 0,
      away_score: matchDataFromApi.away_score || 0,
      api_data: matchDataFromApi // Store the raw API response for future reference if needed
    });
    console.log(`Match with BeSoccer ID ${besoccerMatchId} created.`);
  } else {
    // Optionally update existing match details if they can change (e.g., score, status)
    if (match.status !== matchDataFromApi.status || 
        match.home_score !== matchDataFromApi.home_score || 
        match.away_score !== matchDataFromApi.away_score) {
      await match.update({
        status: matchDataFromApi.status,
        home_score: matchDataFromApi.home_score,
        away_score: matchDataFromApi.away_score,
        api_data: matchDataFromApi
      });
      console.log(`Match with BeSoccer ID ${besoccerMatchId} updated.`);
    }
  }
  return match;
};

/**
 * Processes events for a given match, calculates scores, and updates team totals.
 * @param {string} besoccerMatchId - The unique ID of the match from BeSoccer API.
 * @returns {Promise<string>} A message indicating the outcome.
 */
const processMatchEvents = async (besoccerMatchId) => {
  console.log(`Starting to process events for BeSoccer Match ID: ${besoccerMatchId}`);

  // 1. Fetch detailed match data from BeSoccer
  const matchDetailsFromApi = await besoccerService.fetchMatchDetails(besoccerMatchId);
  if (!matchDetailsFromApi) {
    throw new Error(`No details found for BeSoccer Match ID: ${besoccerMatchId}`);
  }

  // 2. Check match status
  // Allow processing for 'finished' or 'live' matches. Adjust as needed.
  // For 'live' matches, points might be preliminary.
  if (!['finished', 'live'].includes(matchDetailsFromApi.status)) {
    console.log(`Match ${besoccerMatchId} is not 'finished' or 'live' (status: ${matchDetailsFromApi.status}). Skipping scoring.`);
    return `Match ${besoccerMatchId} status is '${matchDetailsFromApi.status}'. Scoring not processed.`;
  }

  // 3. Find or create the internal Match record
  const internalMatch = await findOrCreateMatchByApiId(besoccerMatchId, matchDetailsFromApi);
  if (!internalMatch) {
      throw new Error(`Failed to find or create internal match for BeSoccer ID: ${besoccerMatchId}`);
  }

  const allScoreEventsForThisMatch = [];
  let newScoreEventsCount = 0;

  // 4. Process each event from the API data
  if (matchDetailsFromApi.events && matchDetailsFromApi.events.length > 0) {
    for (const event of matchDetailsFromApi.events) {
      if (!event.api_player_id) {
        console.warn(`Event type ${event.type} for match ${besoccerMatchId} is missing api_player_id. Skipping.`);
        continue;
      }

      const player = await Player.findOne({ where: { api_player_id: event.api_player_id } });
      if (!player) {
        console.warn(`Player with api_player_id ${event.api_player_id} not found in DB for event type ${event.type}. Skipping event.`);
        continue;
      }

      let points = 0;
      const eventTypeUpper = event.type.toUpperCase(); // Normalize event type

      switch (eventTypeUpper) {
        case 'GOAL':
          points = scoringRules.GOAL[player.position.toUpperCase()] || scoringRules.GOAL.DEFAULT;
          break;
        case 'ASSIST':
          points = scoringRules.ASSIST;
          break;
        case 'YELLOW_CARD':
          points = scoringRules.YELLOW_CARD;
          break;
        case 'RED_CARD':
          points = scoringRules.RED_CARD;
          break;
        // Add cases for other event types like OWN_GOAL, PENALTY_SAVED, PENALTY_MISSED
        // For CLEAN_SHEET, it's more complex and usually processed at the end of the match.
      }
      
      if (points !== 0) {
        // Check if this specific event (e.g. based on an API event ID if available, or combination) has already been processed
        // For mock data, we'll assume events are unique or re-processing is handled by not re-creating.
        // A more robust system would use a unique event ID from the API.
        const [scoreEvent, created] = await ScoreEvent.findOrCreate({
          where: {
            match_id: internalMatch.id,
            player_id: player.id,
            event_type: eventTypeUpper,
            // If events have unique IDs from API:
            // api_event_id: event.event_id 
            // For mock, we might use timestamp if event_id is not there, but this is not robust.
            // To avoid duplicates in mock, let's assume one event of a type per player per match for now for simplicity,
            // or add a unique event ID to mock data.
            // The current mock data for fetchMatchDetails has 'event_id'. Let's use it.
            api_event_id: event.event_id || `${eventTypeUpper}_${player.id}_${new Date(event.timestamp).getTime()}` // Fallback if event_id missing
          },
          defaults: {
            points_awarded: points,
            timestamp: new Date(event.timestamp),
            besoccer_match_id: besoccerMatchId // Store for reference
          }
        });

        if (created) {
            newScoreEventsCount++;
            allScoreEventsForThisMatch.push(scoreEvent);
            console.log(`ScoreEvent created for player ${player.id} (API: ${event.api_player_id}), event: ${eventTypeUpper}, points: ${points}`);
        } else {
            console.log(`ScoreEvent for player ${player.id}, event: ${eventTypeUpper} (API event ID: ${event.event_id}) already processed.`);
        }
      }
    }
  } else {
    console.log(`No events found in API data for match ${besoccerMatchId}.`);
  }

  // --- Complex Event Processing (Post-individual events) ---
  // Example: Clean Sheets (requires knowing final score and player participation)
  if (matchDetailsFromApi.status === 'finished') {
    // Placeholder for clean sheet logic:
    // 1. Check if home_score or away_score is 0.
    // 2. Identify which real-world team got the clean sheet.
    // 3. Find all players in your DB belonging to that real-world team (Player.real_world_team_id).
    // 4. For each of those players, check if they played in the match (requires participation data from API).
    // 5. Award points based on scoringRules.CLEAN_SHEET and player position.
    // 6. Create ScoreEvent records for clean sheets.
    console.log(`Match ${besoccerMatchId} is finished. Placeholder for Clean Sheet logic.`);
  }


  // 5. Update Team Scores
  // Fetch all player IDs that had a score event created *in this processing run* or were part of this match.
  // For simplicity now, we'll update scores for teams whose players were involved in *any* event in this match.
  
  // Get all player IDs that have score events for this specific match
  const playersInvolvedInMatch = await ScoreEvent.findAll({
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('player_id')), 'player_id']],
    where: { match_id: internalMatch.id }
  });
  const updatedPlayerIds = playersInvolvedInMatch.map(se => se.player_id);


  if (updatedPlayerIds.length > 0) {
    const teamsToUpdate = await Team.findAll({
      include: [{
        model: Player,
        as: 'players', // Make sure this alias matches your Team model association
        attributes: [], // No need to fetch player attributes here
        where: { id: { [Op.in]: updatedPlayerIds } },
        through: { attributes: [] } // Don't include TeamPlayer attributes
      }]
    });
    
    console.log(`Found ${teamsToUpdate.length} fantasy teams to update based on ${updatedPlayerIds.length} players involved.`);

    for (const team of teamsToUpdate) {
      const teamPlayers = await team.getPlayers({ attributes: ['id'] }); // Fetch IDs of all players in this fantasy team
      const teamPlayerIds = teamPlayers.map(p => p.id);

      const newTotalScore = await ScoreEvent.sum('points_awarded', {
        where: { player_id: { [Op.in]: teamPlayerIds } }
        // This sums ALL score events for these players across ALL matches.
        // If you only want to sum for the current match and add to existing, it's more complex
        // or if Team.total_score is always a full recalculation.
      });
      
      await team.update({ total_score: newTotalScore || 0 });
      console.log(`Updated total_score for Team ID ${team.id} (${team.name}) to ${newTotalScore || 0}.`);
    }
  } else if (newScoreEventsCount === 0) {
      console.log(`No new score events were created for match ${besoccerMatchId}. Team scores remain unchanged based on this run.`);
  }


  return `Successfully processed events for BeSoccer Match ID: ${besoccerMatchId}. ${newScoreEventsCount} new score events created. Team scores updated.`;
};

module.exports = {
  findOrCreateMatchByApiId,
  processMatchEvents
};
