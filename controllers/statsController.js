import express from 'express';
import StatsService from '../services/statsService';

const router = express.Router();

router.post('/citizens', async (req, res) => {
  if (!req.body.hasOwnProperty('stat'))
    return res.status(400).json({ err: 'No Sorting Stat Provided' });

  let result = await StatsService.getCitizenStats(req.body);
  return res.status(result.status).json(result.payload);
});

router.post('/countries', async (req, res) => {
  if (!req.body.hasOwnProperty('stat'))
    return res.status(400).json({ err: 'No Sorting Stat Provided' });

  let result = await StatsService.getCountryStats(req.body);
  return res.status(result.status).json(result.payload);
});

router.post('/parties', async (req, res) => {
  let result = await StatsService.getPartyStats(req.body);
  return res.status(result.status).json(result.payload);
});

router.post('/newspapers', async (req, res) => {
  let result = await StatsService.getNewspaperStats(req.body);
  return res.status(result.status).json(result.payload);
});

export default router;