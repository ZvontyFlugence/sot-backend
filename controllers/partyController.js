import express from 'express';
import auth from '../middleware/auth';
import PartyService from '../services/partyService';

const router = express.Router();

router.get('/', auth, async (_, res) => {
  let parties = await PartyService.getParties();

  return res.status(200).json({ parties });
});

router.get('/:id', auth, async (req, res) => {
  let partyId = -1;
  try {
    partyId = Number.parseInt(req.params.id);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid Party ID!' });
  }

  let party = await PartyService.getParty(partyId);
  
  if (party) {
    return res.status(200).json({ party });
  }

  return res.status(404).json({ error: 'Party Not Found!' });
});

router.patch('/:id/action', auth, async (req, res) => {
  if (!req.body.hasOwnProperty('action'))
    return res.status(400).json({ error: 'No Action Provided!' });

  if (req.body.hasOwnProperty('userId') && req.body.userId !== req.user_id) {
    return res.status(403).json({ error: 'You do not have permission take this action' });
  }

  let partyId = -1;
  try {
    partyId = Number.parseInt(req.params.id);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid Party ID!' });
  }

  let result = await PartyService.doAction(partyId, req.body)
    .catch(err => err);

  return res.status(result.status).json(result.payload);
});

export default router;