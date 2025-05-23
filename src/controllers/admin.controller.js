const scoringService = require('../services/scoring.service');

/**
 * Triggers the scoring process for a given BeSoccer Match ID.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const triggerScoringForMatch = async (req, res) => {
  try {
    const { besoccerMatchId } = req.params; // Or req.body if preferred

    if (!besoccerMatchId) {
      return res.status(400).json({ message: 'BeSoccer Match ID is required.' });
    }

    console.log(`Admin request to trigger scoring for BeSoccer Match ID: ${besoccerMatchId}`);
    const resultMessage = await scoringService.processMatchEvents(besoccerMatchId);
    
    res.status(200).json({ 
      message: `Scoring process triggered for BeSoccer Match ID: ${besoccerMatchId}.`,
      details: resultMessage 
    });

  } catch (error) {
    console.error(`Error in triggerScoringForMatch controller for match ID ${req.params.besoccerMatchId}:`, error);
    // Distinguish between errors from the service (e.g., match not found by BeSoccer) and other unexpected errors
    if (error.message.startsWith('No details found for BeSoccer Match ID') || error.message.startsWith('Failed to find or create internal match')) {
        return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('status is')) { // If match status is not suitable for scoring
        return res.status(409).json({ message: error.message }); // 409 Conflict or 422 Unprocessable Entity might be suitable
    }
    res.status(500).json({ message: error.message || 'Internal server error during scoring process.' });
  }
};

module.exports = {
  triggerScoringForMatch
};
