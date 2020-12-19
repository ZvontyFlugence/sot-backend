import express from 'express';
import auth from '../middleware/auth';
import db from '../services/dbService';
import AuthService from '../services/authService';
import MemberService from '../services/memberService';

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
  
  if (login_res) {
    return res.status(login_res.status).json({ ...login_res.payload });
  } else {
    return res.status(302).json({ message: 'Login to Turmoil Studios Account Failed!' });
  }
});

// Uses validates credentials to find valid TS Account
// if found, creates SoT User Account
// else, returns error
router.post('/register', async (req, res) => {
  let result = await MemberService.createUser(req.body);

  if (result && result.error) {
    return res.status(400).json({ error: result.error })
  } else if (result && result.user) {
    return res.status(201).json({ created: true });
  } else {
    return res.status(500).json({ error: 'Failed to Create User' });
  }
});

export default router;