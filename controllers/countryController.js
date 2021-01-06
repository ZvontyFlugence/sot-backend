import express from 'express';
import auth from '../middleware/auth';
import CountryService from '../services/countryService';
import NewsService from '../services/newsService';
import PartyService from '../services/partyService';

// DEV:
import db from '../services/dbService';

const router = express.Router();

router.get('/', async (_, res) => {
  let countries = await CountryService.getCountries();
  return res.status(200).json({ countries });
});

router.get('/:id', auth, async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ error: 'No Country ID Given' });
  }
  let countryId = 0;

  try {
    countryId = Number.parseInt(req.params.id);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid Country ID'});
  }

  let country = await CountryService.getCountry(countryId);
  
  if (country) {
    return res.status(200).json({ country });
  }

  return res.status(404).json({ error: 'Country Not Found!' });
});

router.get('/:id/demographics', auth, async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ error: 'No Country ID Given' });
  }
  let countryId = 0;

  try {
    countryId = Number.parseInt(req.params.id);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid Country ID'});
  }

  let population = await CountryService.getPopulation(countryId);
  let averageLevel = await CountryService.getAverageLevel(countryId);
  let numNewCitizens = await CountryService.getNumNewCitizens(countryId);

  return res.status(200).json({ population, averageLevel, newCitizens: numNewCitizens });
});

router.get('/:id/regions', auth, async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ error: 'No Country ID Given' });
  }
  let countryId = 0;

  try {
    countryId = Number.parseInt(req.params.id);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid Country ID'});
  }

  let regions = await CountryService.getRegions(countryId);

  return res.status(200).json({ regions });
});

router.get('/:id/articles', auth, async (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ error: 'No Country ID Given' });
  }
  let countryId = 0;

  try {
    countryId = Number.parseInt(req.params.id);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid Country ID'});
  }
  
  let articles = await NewsService.getCountryArticles(countryId);

  return res.status(200).json({ articles });
})

router.get('/:id/jobs', auth, async (req, res) => {
  let id = Number.parseInt(req.params.id);
  let jobOffers = await CountryService.getJobs(id);
  return res.status(200).json({ jobOffers });
});

router.get('/:id/goods', auth, async (req, res) => {
  let id = Number.parseInt(req.params.id);
  let productOffers = await CountryService.getGoods(id);
  return res.status(200).json({ productOffers });
});

router.get('/:id/parties', auth, async (req, res) => {
  let countryId = -1;
  try {
    countryId = Number.parseInt(req.params.id);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid Country ID!' });
  }

  let parties = await CountryService.getParties(countryId);

  return res.status(200).json({ parties });
});

router.get('/:id/politicians', auth, async (req, res) => {
  let countryId = -1;
  try {
    countryId = Number.parseInt(req.params.id);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid Country ID!' });
  }

  let citizens = await CountryService.getCitizens(countryId);
  let politicians = await Promise.all(citizens.filter(citizen => citizen.party > 0 && citizen._id !== req.user_id).map(async citizen => {
    let party = await PartyService.getParty(citizen.party);
    return { ...citizen, party };
  }));

  return res.status(200).json({ politicians });
});

// DEVELOPMENT ONLY (QUICK EDIT COUNTRY)
router.patch('/:id', async (req, res) => {
  const countries = db.getDB().collection('countries');
  let countryId = -1;
  try {
    countryId = Number.parseInt(req.params.id);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid Country ID!' });
  }

  let updated = await countries.updateOne({ _id: countryId }, { $set: req.body });

  if (updated) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(500).json({ success: false });
  }
});

export default router;