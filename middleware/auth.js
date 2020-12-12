import AuthService from '../services/authService';

export default async function auth (req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'No Auth Token' });
  }

  const token = req.headers.authorization;
  let valid_res = await AuthService.validate(token);

  if (valid_res.type === 'invalid') {
    return res.status(403).json({ result: 'invalid', error: valid_res.error });
  }

  req.user_id = valid_res.user_id;

  next();
}