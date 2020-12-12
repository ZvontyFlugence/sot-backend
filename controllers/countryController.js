import express from 'express';
import auth from '../middleware/auth';
import CountryService from '../services/countryService';

const router = express.Router();

router.get('/', async (_, res) => {
  let countries = await CountryService.getCountries();
  return res.status(200).json({ countries });
});

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

export default router;