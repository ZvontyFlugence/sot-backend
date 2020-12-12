import express from 'express';
import db from '../services/dbService';

const router = express.Router();

router.get('/regions', async (req, res) => {
  const regions = db.getDB().collection('regions');
  let list = await regions.find({}).toArray();

  if (list) {
    const countries = db.getDB().collection('countries');
    let region_list = await Promise.all(list.map(async region => {
      let owner = await countries.findOne({ _id: region.owner });
      return { ...region, owner };
    }));

    return res.status(200).json({ regions: region_list });
  }

  return res.status(500).json({ err: 'Something Went Wrong' });
});

// NOT TO BE CALLED BY CLIENT EVER
// DEVELOPMENT ONLY ROUTE TO QUICKLY ADD NEW REGIONS TO THE GAME
router.post('/region', async (req, res) => {
  const regions = db.getDB().collection('regions');
  const num_regions = await regions.estimatedDocumentCount();

  let borders = [];
  for (const path of req.body.borders) {
    borders.push({ lat: path[0], lng: path[1] });
  }

  const doc = {
    _id: num_regions + 1,
    ...req.body,
    borders,
  };

  let result = await regions.insertOne(doc);
  return res.status(200).json({ ok: true, added: result.name });
});

export default router;