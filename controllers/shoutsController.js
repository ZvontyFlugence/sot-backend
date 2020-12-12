import express from 'express';
import auth from '../middleware/auth';
import MemberService from '../services/memberService';
import ShoutsService from '../services/shoutsService';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  let result = { status: 500, payload: { err: 'Something Went Wrong' } };

  switch (req.body.scope) {
    case 'country':
      if (req.body.country) {
        const countryID = req.body.country;
        result = await ShoutsService.countryShouts(countryID);
      }
      break;
    case 'party':
      const partyID = req.body.party;
      result = await ShoutsService.partyShouts(partyID);
      break;
    case 'unit':
      const unitID = req.body.unit;
      result = await ShoutsService.unitShouts(unitID);
      break;
    case 'global':
    default:
      result = await ShoutsService.globalShouts();
      break;
  }

  if (result.payload.shouts) {
    let { shouts } = result.payload;
    result.payload.shouts = await Promise.all(shouts.map(async s => {
      let author = await MemberService.getUser(s.user);
      
      if (author) {
        s.user_name = author.displayName;
        s.user_img = author.image;
      }

      return s;
    }));
  }

  return res.status(result.status).json(result.payload);
});

export default router;