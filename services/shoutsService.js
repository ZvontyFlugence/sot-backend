import db from './dbService';

const ShoutsService = {};

ShoutsService.sendShout = async data => {
  const shouts = db.getDB().collection('shouts');
  let payload = {};

  let shout_obj = {
    user: data.user_id,
    scope: data.scope,
    message: data.message,
    replies: [],
    posted: new Date(Date.now()),
  };

  switch (data.scope) {
    case 'country':
      shout_obj[data.scope] = data.country_id;
    case 'party':
      if (!data.party_id || data.party_id === 0) {
        payload = { success: false, err: 'Invalid Party Id' };
        return Promise.resolve({ status: 400, payload });
      }

      shout_obj[data.scope] = data.party_id;
    case 'unit':
      if  (!data.unit_id || data.unit_id === 0) {
        payload = { success: false, err: 'Invalid Unit Id' };
        return Promise.resolve({ status: 400, payload });
      }

      shout_obj[data.scope] = data.unit_id;
    default:
      break;
  }

  let result = await shouts.insertOne(shout_obj);

  if (result.ops[0]) {
    return Promise.resolve({ status: 201, payload: { success: true } });
  }

  payload = { err: 'Something Unexpected Happened' };
  return Promise.resolve({ status: 500, payload });
};

ShoutsService.sendReply = async data => {
  const shouts = db.getDB().collection('shouts');
  let payload = {};
  let shout = await shouts.findOne({ _id: data.shout_id });

  if (shout) {
    let reply = {
      reply_id: shout.replies.length,
      user: data.user_id,
      message: data.message,
      posted: new Date(Date.now()),
    };

    let result = await shouts.findOneAndUpdate({ _id: shout._id }, { replies: [...shout.replies, reply] }, { new: true });
    
    if (result) {
      payload = { success: true };
      return Promise.resolve({ status: 201, payload });
    }
    payload = { error: 'Something Unexpected Happened' };
    return Promise.resolve({ status: 500, payload });
  }
  payload = { error: 'Shout Not Found' };
  return Promise.resolve({ status: 404, payload });
};

ShoutsService.getShout = async id => {
  const shouts = db.getDB().collection('shouts');
  const users = db.getDB().collection('users');
  let payload = {};

  let shout = await shouts.findOne({ _id: id });

  if (shout) {
    return Promise.resolve({ status: 200, payload: { shout } });
  }
  payload = { error: 'Shout Not Found' };
  return Promise.resolve({ status: 404, payload });
};

ShoutsService.globalShouts = async () => {
  const shouts = db.getDB().collection('shouts');
  let payload = {};

  let shout_list = await shouts.find({ scope: 'global' })
    .sort({ 'posted': -1 })
    .limit(25)
    .toArray();

  if (shout_list) {
    payload = { shouts: shout_list };
    return Promise.resolve({ status: 200, payload });
  }
  payload = { error: 'Global Shouts Not Found' };
  return Promise.resolve({ status: 404, payload });
};

ShoutsService.countryShouts = async countryID => {
  const shouts = db.getDB().collection('shouts');
  let payload = {};

  let shouts_list = await shouts.find({ country: countryID })
    .sort({ 'posted': -1 })
    .limit(25)
    .toArray();

  if (shouts_list) {
    payload = { shouts: shouts_list };
    return Promise.resolve({ status: 200, payload });
  }
  payload = { error: 'Country Shouts Not Found' };
  return Promise.resolve({ status: 404, payload });
};

ShoutsService.partyShouts = async partyID => {
  const shouts = db.getDB().collection('shouts');
  let payload = {};

  let shouts_list = await shouts.find({ party: partyID })
    .sort({ 'posted': -1 })
    .limit(25)
    .toArray();

  if (shouts_list) {
    payload = { shouts: shouts_list };
    return Promise.resolve({ status: 200, payload });
  }
  payload = { error: 'Party Shouts Not Found' };
  return Promise.resolve({ status: 404, payload });
};

ShoutsService.unitShouts = async unitID => {
  const shouts = db.getDB().collection('shouts');
  let payload = {};

  let shouts_list = await shouts.find({ unit: unitID })
    .sort({ 'posted': -1 })
    .limit(25)
    .toArray();

  if (shouts_list) {
    payload = { shouts: shouts_list };
    return Promise.resolve({ status: 200, payload });
  }
  payload = { error: 'Military Unit Shouts Not Found' };
  return Promise.resolve({ status: 404, payload });
};

export default ShoutsService;