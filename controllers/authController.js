import express from 'express';
import auth from '../middleware/auth';
import db from '../services/dbService';
import AuthService from '../services/authService';

const router = express.Router();

router.get('/validate', auth, async (req, res) => {
  const users = db.getDB().collection('users');
  const user = await users.findOne({ _id: req.user_id });
  return res.status(202).json({ result: 'valid', user });
});

router.post('/login', async (req, res) => {
  const hasEmail = req.body.hasOwnProperty('email');
  const hasPassword = req.body.hasOwnProperty('password');

  if (!hasEmail || !hasPassword)
    return res.status(400).json({ err: 'Missing required fields' });

  const { email, password } = req.body;
  let login_res = await AuthService.login(email, password);
  return res.status(login_res.status).json({ ...login_res.payload });
});

router.post('/register', async (req, res) => {
  let user = await MemberService.createUser(req.body);

  if (user) {
    return res.status(201).json({ created: true });
  } else {
    return res.status(500).json({ err: 'Failed to Create User' });
  }
});

export default router;