import express from 'express';
import auth from '../middleware/auth';
import RegionService from '../services/regionService';

const router = express.Router();

// Get All Regions
router.get('/', auth, async (req, res) => {
  let regions = await RegionService.getAllRegions();

  if (regions) {
    return res.status(200).json({ regions });
  } else {
    return res.status(500).json({ err: 'Something Unexpected Happened' });
  }
});

// Get Specific Region
router.get('/:id', auth, async (req, res) => {
  const id = Number.parseInt(req.params.id);
  let region = await RegionService.getRegion(id);

  if (region)
    return res.status(200).json({ region });
  else
    return res.status(404).json({ err: 'Region Not Found' });
});

// Creates a new Region
// DEVELOPMENT ONLY
router.post('/neighbors', async (req, res) => {
  let result = await RegionService.updateNeighbors(req.body);
  return res.status(result.status).json(result.payload);
});

router.post('/travel-distance', async (req, res) => {
  if (!req.body.hasOwnProperty('src') || !req.body.hasOwnProperty('dest'))
    return res.status(400).json({ err: 'Invalid Travel Information' });

  let { src, dest } = req.body;

  if (src === dest)
    return res.status(400).json({ err: 'Already Located In Target Region' });

  let result = await RegionService.getDistance(src - 1, dest - 1);

  if (result)
    return res.status(200).json({ ...result });
  else
    return res.status(500).json({ err: 'Something Went Wrong' });
});

export default router;
