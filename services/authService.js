import axios from 'axios';
import jwt from 'jsonwebtoken';
import MemberService from './memberService';

const secret = 'TS_SECRET';
const TS_API = process.env.TS_API || 'http://localhost:8080/api';
let AuthService = {};

AuthService.validate = async token => {
  return await jwt.verify(token.replace('Bearer ', ''), secret, async (err, decoded) => {
    if (err) {
      return { type: 'invalid', error: 'Invalid Auth Token!' };
    } else {
      return { type: 'valid', user_id: decoded.user_id };
    }
  });
};

AuthService.login = async (email, password) => {
  let response = await axios.post(`${TS_API}/auth/login`, { email, password })
    .catch(err => err.response);
  
  if (response && response.data) {
    const { data } = response;
    if (!data.error && data.user) {
      if (!data.user.games.includes('SoT')) {
        let payload = { err: 'You do not own State of Turmoil!' };
        return Promise.resolve({ status: 403, payload });
      } else {
        let account = data.user.email;
        let user = await MemberService.getLinkedUser(account);
        let token = await jwt.sign({ user_id: user._id }, secret, { expiresIn: '7d' });
        let payload = { token, user };
        return Promise.resolve({ status: 200, payload });
      }
    } else {
      return Promise.resolve({ status: 400, payload: { err: data.error } });
    }
  } else {
    return Promise.resolve({ status: 500, payload: { err: 'Turmoil Studios Account Authentication failed' } })
  }
};

export default AuthService;
