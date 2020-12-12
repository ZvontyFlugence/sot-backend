import express from 'express';
import auth from '../middleware/auth';
import CompService from '../services/compService';
import MemberService from '../services/memberService';

const router = express.Router();

router.get('/ceo/:ceo', auth, async (req, res) => {
  let ceo_id = Number.parseInt(req.params.ceo);
  let companies = await CompService.getUserCompanies(ceo_id);

  if (companies)
    return res.status(200).json({ companies });

  return res.status(404).json({ err: 'User Companies Not Found' });
});

router.get('/:id', auth, async (req, res) => {
  let comp_id = Number.parseInt(req.params.id);
  let company = await CompService.getCompany(comp_id);
  let ceo = await MemberService.getUser(company.ceo);

  company.ceo = ceo;

  company.employees = await Promise.all(company.employees.map(async emp => {
    let employee = await MemberService.getUser(emp.userId);
    return { ...emp, ...employee };
  }));

  if (company)
    return res.status(200).json({ company });

  return res.status(404).json({ err: 'Company Not Found' });
});

router.delete('/:id', auth, async (req, res) => {
  let comp_id = Number.parseInt(req.params.id);
  let result = await CompService.deleteCompany(comp_id);

  return res.status(result.status).json(result.payload);
});

router.post('/:id/action', auth, async (req, res) => {
  const compId = Number.parseInt(req.params.id);
  let result = await CompService.doAction(compId, req.body);

  return res.status(result.status).json(result.payload);
});

router.post('/:id/details', auth, async (req, res) => {
  let comp_id = Number.parseInt(req.params.id);
  let result = await CompService.updateCompanyDetails(req.user_id, comp_id, req.body);

  return res.status(result.status).json(result.payload);
});

export default router;