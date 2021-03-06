import db from './dbService';
import CompService from './compService';
import CountryService from './countryService';
import RegionService from './regionService';
import NewsService from './newsService';
import mongodb from 'mongodb';
import axios from 'axios';
import ArticleService from './articleService';
import PartyService from './partyService';

const TS_API = process.env.TS_API || 'http://localhost:8080/api';

let MemberService = {};
const MemberActions = {
  ACCEPT_JOB_OFFER: 'ACCEPT_JOB_OFFER',
  COLLECT_DAILIES: 'COLLECT_DAILIES',
  CREATE_COMPANY: 'CREATE_COMPANY',
  CREATE_EXCHANGE_OFFER: 'CREATE_EXCHANGE_OFFER',
  CREATE_MESSAGE: 'CREATE_MESSAGE',
  CREATE_NEWSPAPER: 'CREATE_NEWSPAPER',
  CREATE_PARTY: 'CREATE_PARTY',
  DELETE_ALERT: 'DELETE_ALERT',
  DELETE_MESSAGE: 'DELETE_MESSAGE',
  DEPOSIT_ITEMS: 'DEPOSIT_ITEMS',
  DEPOSIT_MONEY: 'DEPOSIT_MONEY',
  DONATE_MONEY: 'DONATE_MONEY',
  EXCHANGE_MONEY: 'EXCHANGE_MONEY',
  FRIEND_REQUEST_RESPONSE: 'FRIEND_REQUEST_RESPONSE',
  GIFT_ITEMS: 'GIFT_ITEMS',
  HEAL: 'HEAL',
  JOIN_PARTY: 'JOIN_PARTY',
  LEAVE_PARTY: 'LEAVE_PARTY',
  LEVEL_UP: 'LEVEL_UP',
  LIKE_ARTICLE: 'LIKE_ARTICLE',
  PURCHASE_ITEM: 'PURCHASE_ITEM',
  READ_ALERT: 'READ_ALERT',
  READ_MESSAGE: 'READ_MESSAGE',
  REMOVE_EXCHANGE_OFFER: 'REMOVE_EXCHANGE_OFFER',
  REMOVE_FRIEND: 'REMOVE_FRIEND',
  SEND_FRIEND_REQUEST: 'SEND_FRIEND_REQUEST',
  SEND_MESSAGE: 'SEND_MESSAGE',
  SHOUT: 'SHOUT',
  SHOUT_REPLY: 'SHOUT_REPLY',
  SUB_NEWSPAPER: 'SUB_NEWS',
  TRAIN: 'TRAIN',
  TRAVEL: 'TRAVEL',
  UNLIKE_ARTICLE: 'UNLIKE_ARTICLE',
  UNSUB_NEWSPAPER: 'UNSUB_NEWS',
  UPDATE_DESC: 'UPDATE_DESC',
  UPLOAD: 'UPLOAD',
  WITHDRAW_ITEMS: 'WITHDRAW_ITEMS',
  WITHDRAW_MONEY: 'WITHDRAW_MONEY',
  WORK: 'WORK',
};

MemberService.createUser = async (regData) => {
  const { email, password } = regData;
  let response = await axios.post(`${TS_API}/auth/login`, { email, password })
    .catch(err => err.response);

  if (response && response.data) {
    const { data } = response;
    if (!data.error) {
      if (!data.user.games.includes('SoT')) {
        let payload = { err: 'You do not own State of Turmoil!' };
        return Promise.resolve({ status: 403, payload });
      } else {
        const users = db.getDB().collection('users');
        const num_users = await users.estimatedDocumentCount();

        const country = await CountryService.getCountry(regData.country);
        const location = await RegionService.startingRegion(regData.country);

        if (!country) {
          return { error: 'Country Not Found' };
        } else if (!location) {
          return { error: 'Error selecting starter region' };
        }

        // Build User Doc
        const user_doc = {
          _id: num_users + 1,
          account: data.user.email,
          displayName: data.user.username,
          image: process.env.DEFAULT_IMAGE || 'http://localhost:3000/default-comp.png',
          createdOn: new Date(Date.now()),
          description: '',
          level: 1,
          xp: 0,
          health: 100,
          country: regData.country,
          gold: 5.00,
          strength: 0,
          location: location._id,
          job: 0,
          party: 0,
          unit: 0,
          newspaper: 0,
          canTrain: new Date(Date.now()),
          canWork: new Date(Date.now()),
          canCollectRewards: new Date(Date.now()),
          canHeal: new Date(Date.now()),
          wallet: [{ currency: country.currency, amount: 25.00 }],
          inventory: [],
          alerts: [],
          messages: [],
          pendingFriends: [],
          friends: [],
        };

        const res = await users.insertOne(user_doc);
        let user = res.ops[0];

        return { user };
      }
    } else {
      return { error: 'Invalid Credentials' };
    }
  }

  return null;
};

MemberService.getAllUsers = async () => {
  const user_coll = db.getDB().collection('users');
  let users = await user_coll.find({}).toArray();

  if (users) {
    return Promise.resolve({ status: 200, payload: { users } });
  }
  
  const payload = { err: 'No Users Found' };
  return Promise.resolve({ status: 404, payload });
};

MemberService.getUser = async id => {
  const users = db.getDB().collection('users');
  return await users.findOne({ _id: id });
};

MemberService.getLinkedUser = async email => {
  const users = db.getDB().collection('users');
  const user = await users.findOne({ account: email });

  return user;
};

MemberService.doAction = async (id, body) => {
  switch (body.action.toUpperCase()) {
    case MemberActions.ACCEPT_JOB_OFFER:
      return await accept_job(id, body.compId, body.offer);
    case MemberActions.COLLECT_DAILIES:
      return await collect_dailies(id);
    case MemberActions.CREATE_COMPANY:
      return await create_company(id, body.comp);
    case MemberActions.CREATE_EXCHANGE_OFFER:
      return await create_exchange_offer(id, body.mode, body.country, body.exchangeOffer);
    case MemberActions.CREATE_MESSAGE:
      return await create_message_thread(id, body.thread);
    case MemberActions.CREATE_NEWSPAPER:
      return await create_news(id, body.newsName);
    case MemberActions.CREATE_PARTY:
      return await create_party(id, body.party);
    case MemberActions.DELETE_ALERT:
      return await delete_alert(id, body.alert);
    case MemberActions.DELETE_MESSAGE:
      return await delete_message_thread(id, body.threadId);
    case MemberActions.DEPOSIT_ITEMS:
      return await deposit_items(id, body.compId, body.giftItems);
    case MemberActions.DEPOSIT_MONEY:
      return await deposit_money(id, body.compId, body.donations);
    case MemberActions.DONATE_MONEY:
      return await donate_money(id, body.recipientId, body.donations);
    case MemberActions.EXCHANGE_MONEY:
      return await exchange_money(id, body.data);
    case MemberActions.FRIEND_REQUEST_RESPONSE:
      return await friend_request_response(id, body.response_data);
    case MemberActions.GIFT_ITEMS:
      return await gift_items(id, body.recipientId, body.giftItems);
    case MemberActions.HEAL:
      return await heal(id);
    case MemberActions.JOIN_PARTY:
      return await join_party(id, body.partyId);
    case MemberActions.LEAVE_PARTY:
      return await leave_party(id, body.partyId);
    case MemberActions.LIKE_ARTICLE:
      return await like_article(id, body.articleId);
    case MemberActions.PURCHASE_ITEM:
      return await purchase_item(id, body.purchase);
    case MemberActions.READ_ALERT:
      return await read_alert(id, body.alert);
    case MemberActions.READ_MESSAGE:
      return await read_message_thread(id, body.threadId);
    case MemberActions.REMOVE_EXCHANGE_OFFER:
      return await remove_exchange_offer(id, body.country, body.offersToRemove);
    case MemberActions.REMOVE_FRIEND:
      return await remove_friend(id, body.friend_id);
    case MemberActions.TRAIN:
      return await train(id);
    case MemberActions.TRAVEL:
      return await travel(id, body.travelInfo);
    case MemberActions.SEND_FRIEND_REQUEST:
      return await send_friend_request(id, body.friend_id);
    case MemberActions.SEND_MESSAGE:
      return await send_message(id, body.threadId, body.reply);
    case MemberActions.SHOUT:
      return await shout(id, body.shout);
    case MemberActions.SHOUT_REPLY:
      return await reply_to_shout(id, body.reply);
    case MemberActions.SUB_NEWSPAPER:
      return await subscribe_to_newspaper(id, body.newsId);
    case MemberActions.UNLIKE_ARTICLE:
      return await unlike_article(id, body.articleId);
    case MemberActions.UNSUB_NEWSPAPER:
      return await unsubscribe_from_newspaper(id, body.newsId);
    case MemberActions.UPDATE_DESC:
      return await update_desc(id, body.desc);
    case MemberActions.UPLOAD:
      return await upload(id, body.image);
    case MemberActions.WITHDRAW_ITEMS:
      return await withdraw_items(id, body.compId, body.giftItems);
    case MemberActions.WITHDRAW_MONEY:
      return await withdraw_money(id, body.compId, body.donations);
    case MemberActions.WORK:
      return await work(id);
    default:
      const payload = { success: false, error: 'Unsupported Action!' };
      return Promise.resolve({ status: 400, payload });
  }
}

const neededXP = level => Math.round(0.08*(level**3)+0.8*(level**2)+2*level);

const train = async id => {
  const user = await MemberService.getUser(id);
  const users = db.getDB().collection('users');

  if (user.canTrain > new Date(Date.now())) {
    const payload = { success: false, error: 'You cannot train yet' };
    return Promise.resolve({ status: 400, payload });
  }

  if (user.health < 10) {
    const payload = { success: false, error: 'Insufficient Health!' };
    return Promise.resolve({ status: 400, payload });
  }

  let updates = {
    strength: user.strength + 1,
    xp: user.xp + 1,
    health: user.health - 10,
    canTrain: new Date(new Date().setUTCHours(24, 0, 0, 0)),
  };

  if (updates.xp >= neededXP(user.level)) {
    updates.level = user.level + 1;
    updates.gold = user.gold + 1.0;
    updates.alerts = [...user.alerts, buildLevelUpAlert(updates.level)];
  }

  const updated_user = await users.findOneAndUpdate({ _id: user._id }, { $set: updates }, { new: true });

  if (updated_user) {
    return Promise.resolve({ status: 200, payload: { success: true } });
  }
  const payload = { success: false, error: 'Something Unexpected Happened!' };
  return Promise.resolve({ status: 500, payload });
}

const heal = async id => {
  const user = await MemberService.getUser(id);
  const users = db.getDB().collection('users');
  let payload = {};

  if (user.canHeal > new Date(Date.now())) {
    payload = { success: false, error: 'You\'ve already healed today' };
    return Promise.resolve({ status: 400, payload });
  }

  if (user.health === 100) {
    payload = { success: false, error: 'You\'re already at max health!' };
    return Promise.resolve({ status: 400, payload });
  }

  const canHeal = new Date(new Date().setUTCHours(24, 0, 0, 0));
  let updates = { health: Math.min(user.health + 50, 100), canHeal };
  const updated_user = await users.findOneAndUpdate({ _id: user._id }, { $set: updates }, { new: true });

  if (updated_user) {
    return Promise.resolve({ status: 200, payload: { success: true } });
  }
  payload = { success: false, error: 'Something Unexpected Happened!' };
  return Promise.resolve({ status: 500, payload });
}

const upload = async (id, image) => {
  const users = db.getDB().collection('users');
  
  if (!image) {
    const payload = { success: false, error: 'Invalid Base64 Image' };
    return Promise.resolve({ status: 400, payload });
  }

  let updated_user = await users.findOneAndUpdate({ _id: id }, { $set: { image } }, { new: true });

  if (updated_user) {
    return Promise.resolve({ status: 200, payload: { success: true } });
  }
  const payload = { success: false, error: 'Something Unexpected Happened!' };
  return Promise.resolve({ status: 500, payload });
}

const send_friend_request = async (id, friend_id) => {
  const users = db.getDB().collection('users');
  const user = await MemberService.getUser(id);
  const friend = await MemberService.getUser(friend_id);
  const message = `You have received a friend request from ${user.displayName}`;
  const alert = {
    read: false,
    type: MemberActions.SEND_FRIEND_REQUEST,
    message,
    from: id,
    timestamp: new Date(Date.now())
  };

  let alerts = [...friend.alerts, alert];
  let pendingFriends = [...user.pendingFriends, friend_id];

  let updated_friend = await users.findOneAndUpdate({ _id: friend_id }, { $set: { alerts } });
  let updated_user = await users.findOneAndUpdate({ _id: id }, { $set: { pendingFriends } });

  if (updated_friend && updated_user) {
    return Promise.resolve({ status: 200, payload: { success: true  } });
  }
  return Promise.resolve({ status: 500, payload: { success: false, error: 'Something Unexpected Happened!' } });
}

const read_alert = async (id, alert) => {
  const user = await MemberService.getUser(id);
  const users = db.getDB().collection('users');

  if (alert.index > -1) {
    user.alerts[alert.index].read = true;
    let updated_user = await users.findOneAndUpdate({ _id: user._id }, { $set: { alerts: user.alerts } });
    if (updated_user) {
      return Promise.resolve({ status: 200, payload: { success: true } })
    } else {
      const payload = { success: false, error: 'Something Unexpected Happened' };
      return Promise.resolve({ status: 500, payload });
    }
  }

  const payload = { success: false, error: 'Alert Not Found' };
  return Promise.resolve({ status: 404, payload });
}

const delete_alert = async (id, alert) => {
  const user = await MemberService.getUser(id);
  const users = db.getDB().collection('users');

  if (alert.index > -1) {
    user.alerts.splice(alert.index, 1);
    let updated_user = await users.findOneAndUpdate({ _id: user._id }, { $set: { alerts: user.alerts } });

    if (updated_user) {
      return Promise.resolve({ status: 200, payload: { success: true } });
    } else {
      const payload = { success: false, error: 'Something Unexpected Happened' };
      return Promise.resolve({ status: 500, payload });
    }
  }

  const payload = { success: false, error: 'Alert Not Found' };
  return Promise.resolve({ status: 404, payload });
}

const update_desc = async (id, description) => {
  const users = db.getDB().collection('users');

  let updated_user = await users.findOneAndUpdate({ _id: id }, { $set: { description } });

  if (updated_user) {
    return Promise.resolve({ status: 200, payload: { success: true } });
  }
  
  const payload = { success: false, error: 'Something Unexpected Happened' };
  return Promise.resolve({ status: 500, payload });
}

const shout = async (id, data) => {
  data.user_id = id;
  return ShoutsService.sendShout(data); 
}

const reply_to_shout = async (id, data) => {
  data.user_id = id;
  return ShoutsService.sendReply(data);
}

const create_company = async (id, data) => {
  const users = db.getDB().collection('users');
  let user = await MemberService.getUser(id);

  if (user.gold < 25) {
    return Promise.resolve({ status: 400, payload: { success: false, error: 'Insufficient Funds' } });
  }

  if (data.type === 0) {
    return Promise.resolve({ status: 400, payload: { success: false, error: 'Invalid Company Type' } });
  }

  data.ceo = id;
  data.location = user.location;

  let result = await CompService.createCompany(data)
    .catch(err => err);

  if (result && result.payload.success) {
    const gold = user.gold - 25;
    let res = await users.findOneAndUpdate({ _id: id }, { $set: { gold } }, { new: true });
    
    if (res) {
      return Promise.resolve(result);
    }
    return Promise.resolve({ status: 500, payload: { success: false, error: 'Something Unexpected Happened' } });
  }

  return Promise.resolve(result);
}

const travel = async (id, data) => {
  const users = db.getDB().collection('users');
  let user = await MemberService.getUser(id);
  if (user) {
    if (user.location === data.dest) {
      return Promise.resolve({ status: 400, payload: { success: false, error: 'Already Located In Region' } });
    }

    let travelInfo = await RegionService.getDistance(user.location, data.dest);

    if (travelInfo) {
      if (user.gold < travelInfo.cost) {
        return Promise.resolve({ status: 400, payload: { success: false, error: 'Insufficient Funds' } });
      }

      const location = data.dest;
      const gold = user.gold - travelInfo.cost;
      let updated = await users.findOneAndUpdate({ _id: id }, { $set: { location, gold }}, { new: true });

      if (updated)
        return Promise.resolve({ status: 200, payload: { success: true } });
    }
    return Promise.resolve({ status: 500, payload: { success: false, error: 'Something Went Wrong' } });
  }
  return Promise.resolve({ status: 404, payload: { success: false, error: 'User Not Found' } });
}

const friend_request_response = async (id, data) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let friend = await users.findOne({ _id: data.friend_id });
  let payload, user_updates, friend_updates = {};

  let index = friend.pendingFriends.indexOf(id);
  if (index >= 0) {
    friend.pendingFriends.splice(index, 1);
    user.alerts.splice(data.alert_index, 1);
  }

  switch (data.response) {
    case 'accept':
      user_updates = { alerts: user.alerts, friends: [...user.friends, friend._id] };
      friend_updates = { pendingFriends: friend.pendingFriends, friends: [...friend.friends, user._id] };
      break;
    case 'decline':
      user_updates = { alerts: user.alerts };
      friend_updates = { pendingFriends: friend.pendingFriends };
      break;
    default:
      payload = { success: false, error: 'Invalid Response Type' };
      return Promise.resolve({ status: 400, payload });
  }

  let updated_friend = users.findOneAndUpdate({ _id: friend._id }, { $set: friend_updates });
  let updated_user = users.findOneAndUpdate({ _id: id }, { $set: user_updates });

  if (updated_friend && updated_user) {
    return Promise.resolve({ status: 200, payload: { success: true } });
  }
  payload = { success: false, error: 'Something Went Wrong' };
  return Promise.resolve({ status: 500, payload });
}

const remove_friend = async (id, friend_id) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let friend = await users.findOne({ _id: friend_id });

  let user_index = friend.friends.indexOf(id);
  let friend_index = user.friends.indexOf(friend._id);

  user.friends.splice(friend_index, 1);
  friend.friends.splice(user_index, 1);

  let user_friends = user.friends;
  let friend_friends = friend.friends;

  let updated_friend = await users.findOneAndUpdate({ _id: friend._id }, { $set: { friends: friend_friends } });
  let updated_user = await users.findOneAndUpdate({ _id: id }, { $set: { friends: user_friends } });

  if (updated_friend && updated_user) {
    return Promise.resolve({ status: 200, payload: { success: true } });
  }
  return Promise.resolve({ status: 500, payload: { success: false, error: 'Something Went Wrong!' } });
}

const purchase_item = async (id, data) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let company = await CompService.getCompany(data.compId);
  let payload = {};

  // Validate User exists
  if (!user) {
    payload = { success: false, error: 'User Not Found!' };
    return Promise.resolve({ status: 404, payload });
  }

  // Validate Company exists
  if (!company) {
    payload = { success: false, error: 'Company Not Found!' };
    return Promise.resolve({ status: 404, payload });
  }

  // Validate offer exists
  let comp_offer = company.productOffers.find(o => o.id === data.offer.id);
  if (!comp_offer) {
    payload = { success: false, error: 'Product Offer Not Found!' };
    return Promise.resolve({ status: 404, payload });
  }

  // Validate user has sufficient funds
  // SOME ISSUE HERE
  let user_cc = user.wallet.find(cc => cc.currency === company.funds.currency) || ({ amount: 0.00 });
  let total_cost = (comp_offer.price * data.purchaseAmount);
  if (user_cc.amount < total_cost) {
    payload = { success: false, error: 'Insufficient Funds!' };
    return Promise.resolve({ status: 400, payload });
  }

  let comp_updates = {};
  let user_updates = {};
  // Subtract amount from offer, delete offer if no remaining stock
  if (comp_offer.quantity === data.purchaseAmount) {
    company.productOffers.splice(company.productOffers.indexOf(comp_offer), 1);
    comp_updates.productOffers = [...company.productOffers];
  } else if (comp_offer.quantity > data.purchaseAmount) {
    company.productOffers.splice(company.productOffers.indexOf(comp_offer), 1);
    comp_offer.quantity -= data.purchaseAmount;
    comp_updates.productOffers = [...company.productOffers, comp_offer];
  } else {
    // comp_offer.quantity < data.purchaseAmount
    payload = { success: false, error: 'Cannot Purchase More Items Than Offered' };
    return Promise.resolve({ status: 400, payload });
  }

  // Handle Money Transfer
  let new_comp_amount = company.funds.amount;
  new_comp_amount += total_cost;
  comp_updates.funds = { ...company.funds, amount: new_comp_amount };
  user.wallet.splice(user.wallet.indexOf(user_cc), 1);
  user_cc.amount -= total_cost;
  user_updates.wallet = [...user.wallet, user_cc];

  // Add item(s) to user inventory
  let item = user.inventory.find(i => i.id === comp_offer.id);
  if (item) {
    user.inventory.splice(user.inventory.indexOf(item), 1);
    item.quantity += data.purchaseAmount;
    user_updates.inventory = [...user.inventory, item]; 
  } else {
    user_updates.inventory = [...user.inventory, { id: comp_offer.id, quantity: data.purchaseAmount }];
  }

  let updated_user = await users.findOneAndUpdate({ _id: id }, { $set: user_updates });
  let updated_comp = await db.getDB().collection('companies')
    .findOneAndUpdate({ _id: data.compId }, { $set: comp_updates });

  if (updated_user && updated_comp) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  payload = { success: false, error: 'Something Went Wrong' };
  return Promise.resolve({ status: 500, payload });
}

const buildLevelUpAlert = level => ({
  read: false,
  type: MemberActions.LEVEL_UP,
  message: `Congrats! You have leveled up to level ${level} and received 1 gold`,
  timestamp: new Date(Date.now()),
});

const accept_job = async (id, compId, offer) => {
  let users = db.getDB().collection('users');
  let payload = { success: false, error: 'Something Went Wrong!' };
  let updates = {};
  // Get User
  let user = await users.findOne({ _id: id });
  // Get Company
  let company = await CompService.getCompany(compId);

  // Check if user was found
  if (!user) {
    payload = { success: false, error: 'User Not Found' };
    return Promise.resolve({ status: 404, payload });
  }

  // Check if company was found
  if (!company) {
    payload = { success: false, error: 'Company Not Found' };
    return Promise.resolve({ status: 404, payload });
  }

  // Make sure offer is valid
  let jobOffer = company.jobOffers.find(o => o.id == offer.id);
  if (!jobOffer) {
    payload = { success: false, error: 'Job Offer Not Found' };
    return Promise.resolve({ status: 404, payload });
  }

  // Remove offer from company (or decrease quantity from offer)
  // And add user to company employee list
  let newEmployee = { title: offer.title, wage: offer.wage, userId: id };
  if (jobOffer.quantity > 1) {
    jobOffer.quantity--;
  } else {
    let index = company.jobOffers.indexOf(jobOffer);
    company.jobOffers.splice(index, 1);
  }

  updates.jobOffers = [...company.jobOffers];
  updates.employees = [...company.employees, newEmployee];
  let updated_comp = await db.getDB().collection('companies')
    .findOneAndUpdate({ _id: compId }, { $set: updates });

  if (!updated_comp) {
    return Promise.resolve({ status: 500, payload });
  }

  // Update user job info
  updates = { job: compId };
  let updated = users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  return Promise.resolve({ status: 500, payload });
}

const work = async id => {
  let users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = { success: false, error: 'Something Went Wrong!' };
  let updates = {};
  
  if (!user) {
    payload = { success: false, error: 'User Not Found' };
    return Promise.resolve({ status: 404, payload });
  } else if (user.job === 0) {
    payload = { success: false, error: 'User Is Not Employed' };
    return Promise.resolve({ status: 400, payload });
  } else if (user.health < 10) {
    payload = { success: false, error: 'Not Enough Health' };
    return Promise.resolve({ status: 400, payload });
  }

  let company = await CompService.getCompany(user.job);

  // get employee record from company
  let employee = company.employees.find(emp => emp.userId === id);

  // Deduct wage from company treasury
  if (company.funds.amount < employee.wage) {
    payload = { success: false, error: 'Insufficient Company Funds' };
    return Promise.resolve({ status: 400, payload });
  }

  company.funds.amount -= employee.wage;

  // Add wage to user wallet
  let walletIndex = user.wallet.findIndex(money => money.currency === company.funds.currency);
  if (walletIndex > -1) {
    user.wallet[walletIndex].amount += employee.wage;
  } else {
    user.wallet.push({ currency: company.funds.currency, amount: employee.wage });
  }

  // Produce items
  let type = -1;
  switch (company.type) {
    case 2:
      type = 0;
      break;
    default:
      payload = { success: false, error: 'Invalid Item Type' };
      return Promise.resolve({ status: 400, payload });
  }

  let itemIndex = company.inventory.findIndex(item => item.id === type);
  // TODO: Update formula for non-raw companies to consume raws
  let tempFormula = Math.round(((user.health / 100) + 1) * 10);
  
  // Add items to company inventory
  if (itemIndex !== -1) {
    company.inventory[itemIndex].quantity += tempFormula;
  } else {
    company.inventory.push({ id: type, quantity: tempFormula });
  }

  // Update Company
  updates.inventory = [...company.inventory];
  updates.funds = company.funds;
  let updated_comp = await db.getDB().collection('companies')
    .findOneAndUpdate({ _id: user.job }, { $set: updates });

  if (!updated_comp) {
    return Promise.resolve({ status: 500, payload });
  }

  // Update User
  updates = {};
  updates.xp = user.xp + 1;
  updates.health = user.health - 10;
  updates.wallet = [...user.wallet];
  updates.canWork = new Date(new Date().setUTCHours(24, 0, 0, 0));
  if (user.xp >= neededXP(user.level)) {
    updates.level = user.level + 1;
    updates.gold = user.gold + 1.0;
    updates.alerts = [...user.alerts, buildLevelUpAlert(updates.level)];
  }
  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  return Promise.resolve({ status: 500, payload });
}

const collect_dailies = async id => {
  let users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = { success: false, error: 'Something Went Wrong!' };
  let updates = {};

  if (!user) {
    payload = { success: false, error: 'User Not Found' };
    return Promise.resolve({ status: 404, payload });
  }

  updates.xp = user.xp + 1;
  updates.canCollectRewards = new Date(new Date().setUTCHours(24, 0, 0, 0));

  if (updates.xp >= neededXP(user.level)) {
    updates.level = user.level + 1;
    updates.gold = user.gold + 1.0;
    updates.alerts = [...user.alerts, buildLevelUpAlert(updates.level)];
  }

  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  return Promise.resolve({ status: 500, payload });
}

const create_message_thread = async (id, thread) => {
  let users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let notAllSet = false;
  let payload = {};
  let updates = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let { participants } = thread;
  participants.push(id);

  let msg = { from: id, message: thread.message, timestamp: thread.timestamp };

  let threadId = new mongodb.ObjectID();

  for (let i = 0; i < participants.length; i++) {
    let uid = participants[i];
    let participant = await users.findOne({ _id: uid });

    if (!participant) {
      notAllSet = true;
      continue;
    }

    participant.messages.push({
      id: threadId,
      participants,
      subject: thread.subject,
      messages: [msg],
      timestamp: thread.timestamp,
      read: uid === id,
    });

    updates.messages = participant.messages;

    let updated = await users.findOneAndUpdate({ _id: uid }, { $set: updates });

    if (!updated) {
      notAllSet = true;
    }
  }

  if (!notAllSet) {
    payload.success = true;
    return Promise.resolve({ status: 201, payload });
  }

  payload.error = 'Something Went Wrong';
  return Promise.resolve({ status: 500, payload });
}

const read_message_thread = async (id, threadId) => {
  let users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let updates = {};
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let msg_thread = user.messages.find(thread => thread.id == threadId);

  if (!msg_thread) {
    payload.error = 'Message Thread Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  msg_thread.read = true;

  updates.messages = user.messages;
  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const delete_message_thread = async (id, threadId) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = {};
  let updates = {};

  let threadIndex = user.messages.findIndex(thrd => thrd.id == threadId);

  if (threadIndex === -1) {
    payload.error = 'Message Thread Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  user.messages.splice(threadIndex, 1);
  updates.messages = [...user.messages];
  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const send_message = async (id, threadId, reply) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let notAllSet = false;
  let payload = {};
  let updates = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let msg_thread = user.messages.find(thread => thread.id == threadId);

  if (!msg_thread) {
    payload.error = 'Message Thread Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  for (let i = 0; i < msg_thread.participants.length; i++) {
    let uid = msg_thread.participants[i];
    let participant = await users.findOne({ _id: uid });

    if (!participant) {
      notAllSet = true;
      continue;
    }

    let thread = participant.messages.find(thrd => thrd.id == threadId);

    if (!thread) {
      notAllSet = true;
      continue;
    }

    thread.messages.push(reply);
    thread.read = false;
    updates.messages = [...participant.messages];
    let updated = await users.findOneAndUpdate({ _id: uid }, { $set: updates });

    if (!updated) {
      notAllSet = true;
    }
  }

  if (!notAllSet) {
    payload.success = true;
    return Promise.resolve({ status: 201, payload });
  }
  
  payload.error = 'Something Went Wrong';
  return Promise.resolve({ status: 500, payload });
}

const create_exchange_offer = async (id, mode, countryID, exchangeOffer) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = {};
  let updates = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let country = await CountryService.getCountry(countryID);

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  // Validate User has enough gold/cc
  if (mode === 0) {
    // validate gold
    if (user.gold < exchangeOffer.sellAmount) {
      payload.error = 'Insufficient Funds!';
      return Promise.resolve({ status: 400, payload });
    }

    user.gold -= exchangeOffer.sellAmount;
    updates.gold = user.gold;
  } else {
    // validate cc
    let userCC = user.wallet.find(cc => cc.currency === country.currency);
    
    if (!userCC || userCC.amount < exchangeOffer.sellAmount) {
      payload.error = 'Insufficient Funds!';
      return Promise.resolve({ status: 400, payload });
    }

    userCC.amount -= exchangeOffer.sellAmount;
    updates.wallet = [...user.wallet];
  }

  // Update User
  let updated = await users.updateOne({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Something Went Wrong!';
    return Promise.resolve({ status: 500, payload });
  }

  // Append offer to country exchange offers
  let seller = {
    id: user._id,
    displayName: user.displayName,
    image: user.image,
  };
  country.exchangeOffers.push({ ...exchangeOffer, seller, mode, id: new mongodb.ObjectId() });
  updates = {};
  updates.exchangeOffers = [...country.exchangeOffers];
  updated = await db.getDB().collection('countries').updateOne({ _id: countryID }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong';
  return Promise.resolve({ status: 500, payload });
}

const exchange_money = async (id, { offerId, countryId, purchaseAmount }) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = {};
  let updates = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let country = await CountryService.getCountry(countryId);

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let offer_index = country.exchangeOffers.findIndex(eo => eo.id == offerId);

  if (offer_index === -1) {
    payload.error = 'Offer Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let offer = country.exchangeOffers[offer_index];
  if (purchaseAmount > offer.sellAmount) {
    payload.error = 'Cannot purchase more than available';
    return Promise.resolve({ status: 400, payload });
  }

  let seller = await users.findOne({ _id: offer.seller.id });

  if (!seller) {
    payload.error = 'Seller Not Found';
    return Promise.resolve({ status: 404, payload });
  } else if (seller._id === user._id) {
    payload.error = 'Cannot exchange from your own offer';
    return Promise.resolve({ status: 400, payload });
  }

  let cost = Number(purchaseAmount * offer.exchangeRate);
  let userCC = user.wallet.find(cc => cc.currency === country.currency);

  // More Validations and Make Calculations
  if (offer.mode === 0) {
    if (!userCC || userCC.amount < cost) {
      payload.error = 'Insufficient Funds';
      return Promise.resolve({ status: 400, payload });
    }

    userCC.amount -= cost;
    user.gold += Number(purchaseAmount);

    let sellerCC = seller.wallet.find(cc => cc.currency === country.currency);
    if (!sellerCC) {
      seller.wallet.push({ currency: country.currency, amount: cost });
    } else {
      sellerCC.amount += cost;
    }
    updates.wallet = [...seller.wallet];
  } else {
    if (user.gold < cost) {
      payload.error = 'Insufficient Funds';
      return Promise.resolve({ status: 400, payload });
    }

    user.gold -= cost;
    userCC.amount += Number(purchaseAmount);

    seller.gold += cost;
    updates.gold = Number(seller.gold);
  }

  // Update Seller
  let updated = await users.updateOne({ _id: seller.id }, { $set: updates });

  if (!updated) {
    payload.error = 'Something Went Wrong!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update Buyer
  updates = { wallet: [...user.wallet], gold: user.gold };
  updated = await users.updateOne({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Something Went Wrong!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update Offer
  if (purchaseAmount === offer.sellAmount) {
    // Remove entire offer
    country.exchangeOffers.splice(offer_index, 1);
  } else {
    country.exchangeOffers[offer_index].sellAmount -= purchaseAmount;
  }

  updates.exchangeOffers = [...country.exchangeOffers];
  updated = await db.getDB().collection('countries')
    .updateOne({ _id: countryId }, { $set: updates });

  if (!updated) {
    payload.error = 'Something Went Wrong!';
    return Promise.resolve({ status: 500, payload });
  }

  // Return
  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

const create_news = async (id, newsName) => {
  let users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (user.gold < 5.0) {
    payload.error = 'Insufficient Funds!';
    return Promise.resolve({ status: 400, payload });
  }

  let result = await NewsService.createNews({ name: newsName, author: id })
    .catch(err => err);

  if (result && result.payload.success) {
    const gold = user.gold - 5.0;
    const newspaper = result.payload.newsId;
    let res = await users.findOneAndUpdate({ _id: id }, { $set: { gold, newspaper }});

    if (res)
      return Promise.resolve({ status: result.status, payload: result.payload });
  }

  payload = { success: false, error: 'Something Went Wrong!' };
  return Promise.resolve({ status: 500, payload });
}

const like_article = async (id, articleId) => {
  const articles = db.getDB().collection('articles');
  let payload = {};

  let article = await ArticleService.getArticle(articleId);

  if (!article) {
    payload.error = 'Article Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  if (article.likes.includes(id)) {
    payload.error = 'You have already liked the article!';
    return Promise.resolve({ status: 400, payload });
  } else {
    let updates = { likes: [...article.likes, id] };
    let updated = await articles.updateOne({ _id: new mongodb.ObjectId(articleId) }, { $set: updates });

    if (!updated) {
      payload.error = 'Failed to like article!';
      return Promise.resolve({ status: 500, payload });
    }

    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }
}

const subscribe_to_newspaper = async (id, newsId) => {
  const newspapers = db.getDB().collection('newspapers');
  let payload = {};

  let newspaper = await newspapers.findOne({ _id: newsId });

  if (!newspaper) {
    payload.error = 'Newspaper Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (newspaper.subscribers.includes(id)) {
    payload.error = 'You are already subscribed!';
    return Promise.resolve({ status: 400, payload });
  } else {
    newspaper.subscribers.push(id);
    let updates = { subscribers: [...newspaper.subscribers] };
    let updated = await newspapers.updateOne({ _id: newsId }, { $set: updates });

    if (!updated) {
      payload.error = 'Failed to subscribe to newspaper!';
      return Promise.resolve({ status: 500, payload });
    }

    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }
}

const remove_exchange_offer = async (id, countryId, offersToRemove) => {
  const users = db.getDB().collection('users');
  const countries = db.getDB().collection('countries');
  let user = await users.findOne({ _id: id });
  let payload = {};
  let updates = {};
  let allRemoved = true;

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let country = await CountryService.getCountry(countryId);

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  for (let offerId of offersToRemove) {
    // Get offer index
    let index = country.exchangeOffers.findIndex(off => off.id == offerId);
    if (index >= 0) {
      // Get offer object
      let exchangeOffer = country.exchangeOffers[index];
      // Remove offer from market
      country.exchangeOffers.splice(index, 1);
      // Update country
      updates.exchangeOffers = [...country.exchangeOffers];
      let updatedCountry = await countries.findOneAndUpdate({ _id: countryId }, { $set: updates });

      if (!updatedCountry) {
        console.log('Country Not Updated');
        allRemoved = false;
        continue;
      }

      // Send finances back to user
      if (exchangeOffer.mode === 0) {
        user.gold += exchangeOffer.sellAmount;
      } else {
        let userCC = user.wallet.find(cc => cc.currency === country.currency);
        if (userCC) {
          userCC += exchangeOffer.sellAmount;
        } else {
          user.wallet.push({ currency: country.currency, amount: exchangeOffer.sellAmount });
        }
      }
    } else {
      console.log('Exchange Offer Not Found');
      allRemoved = false;
    }
  }

  // Update user
  updates = { gold: user.gold, wallet: [...user.wallet] };
  let updatedUser = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updatedUser) {
    payload.error = 'Failed To Update User!';
    return Promise.resolve({ status: 500, payload });
  }

  if (allRemoved) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Not All Selected Offers Removed';
  return Promise.resolve({ status: 500, payload });
}

const unlike_article = async (id, articleId) => {
  const articles = db.getDB().collection('articles');
  let payload = {};

  let article = await ArticleService.getArticle(articleId);

  if (!article) {
    payload.error = 'Article Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (!article.likes.includes(id)) {
    payload.error = 'You never liked the article!';
    return Promise.resolve({ status: 400, payload });
  } else {
    let index = article.likes.findIndex(like => like === id);
    article.likes.splice(index, 1);
    let updates = { likes: [...article.likes] };
    let updated = await articles.findOneAndUpdate({ _id: new mongodb.ObjectId(articleId) }, { $set: updates });

    if (!updated) {
      payload.error = 'Failed to unlike article!';
      return Promise.resolve({ status: 500, payload });
    }

    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }
}

const unsubscribe_from_newspaper = async (id, newsId) => {
  const newspapers = db.getDB().collection('newspapers');
  let newspaper = await newspapers.findOne({ _id: newsId });
  let payload = {};

  if (!newspaper) {
    payload.error = 'Newspaper Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (!newspaper.subscribers.includes(id)) {
    payload.error = 'You are not a subscriber!';
    return Promise.resolve({ status: 400, payload });
  } else {
    let index = newspaper.subscribers.findIndex(sub => sub === id);
    newspaper.subscribers.splice(index, 1);
    let updates = { subscribers: [...newspaper.subscribers] };
    let updated = await newspapers.findOneAndUpdate({ _id: newsId }, { $set: updates });

    if (!updated) {
      payload.error = 'Failed to Unsubscribe from Newspaper!';
      return Promise.resolve({ status: 500, payload });
    }

    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }
}

const donate_money = async (id, recipientId, donations) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let allDonated = true;
  let updates = {};
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let recipient = await users.findOne({ _id: recipientId });

  if (!recipient) {
    payload.error = 'Recipient Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  for (let donation of donations) {
    if (donation.currency === 'Gold') {
      if (user.gold < donation.amount) {
        allDonated = false;
        continue;
      }

      user.gold -= donation.amount;
      recipient.gold += donation.amount;
    } else {
      let userCC = user.wallet.find(cc => cc.currency === donation.currency);

      if (!userCC || userCC.amount < donation.amount) {
        allDonated = false;
        continue;
      }

      userCC.amount -= donation.amount;
      let recipientCC = recipient.wallet.find(cc => cc.currency === donation.currency);

      if (!recipientCC) {
        recipient.wallet.push({ currency: donation.currency, amount: donation.amount });
      } else {
        recipientCC.amount += donation.amount;
      }
    }
  }

  // Update recipient
  let alert = {
    read: false,
    type: 'RECEIVED_DONATION',
    message: `You have received a donation from ${user.displayName}`,
    timestamp: new Date(Date.now()),
  };
  updates = { alerts: [...recipient.alerts, alert], gold: recipient.gold, wallet: [...recipient.wallet] };
  let updated = await users.findOneAndUpdate({ _id: recipient._id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to update Recipient!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update User
  updates = { gold: user.gold, wallet: [...user.wallet] };
  updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update User';
    return Promise.resolve({ status: 500, payload });
  } else if (!allDonated) {
    payload.error = 'Not All Donations Made!';
    payload.errorDetail = 'Insufficient funds for one or more donations';
    return Promise.resolve({ status: 400, payload });
  }

  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

const gift_items = async (id, recipientId, giftItems) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let allGifted = true;
  let updates = {};
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let recipient = await users.findOne({ _id: recipientId });
  if (!recipient) {
    payload.error = 'Recipient Not Found!';
    return Promise.resolve({ satus: 404, payload });
  }

  for (let gift of giftItems) {
    let giftIndex = user.inventory.findIndex(item => item.id === gift.id);

    if (giftIndex === -1) {
      allGifted = false;
      continue;
    }

    // Remove item from Sender
    let giftItem = user.inventory.splice(index, 1);
    if (giftItem.quantity < gift.quantity) {
      allGifted = false;
      continue;
    } else if (giftItem.quantity > gift.quantity) {
      giftItem.quantity -= gift.quantity;
      user.inventory.push(giftItem.quantity);
    }

    // Add item to recipient
    giftIndex = recipient.inventory.findIndex(item => item.id === gift.id);
    if (giftIndex === -1) {
      recipient.inventory.push({ id: gift.id, quantity: gift.quantity });
    } else {
      recipient.inventory[giftIndex].quantity += gift.quantity;
    }
  }

  // Update recipient
  let alert = {
    read: false,
    type: 'RECEIVED_GIFT',
    message: `You have received a gift from ${user.displayName}`,
    timestamp: new Date(Date.now()),
  };
  updates = { alerts: [...recipient.alerts, alert], inventory: [...recipient.inventory] };
  let updated = await users.findOneAndUpdate({ _id: recipientId }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update Recipient!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update sender
  updates = { inventory: [...user.inventory] };
  updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update User!';
    return Promise.resolve({ status: 500, payload });
  } else if (!allGifted) {
    payload.error = 'Not All Gifts Made!';
    payload.errorDetail = 'Insufficient quantity of items to complete one or more gifts';
    return Promise.resolve({ status: 400, payload });
  }

  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

const deposit_items = async (id, compId, giftItems) => {
  const users = db.getDB().collection('users');
  const companies = db.getDB().collection('companies');
  let user = await users.findOne({ _id: id });
  let allDeposited = true;
  let updates = {};
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let company = await CompService.getCompany(compId);

  if (!company) {
    payload.error = 'Company Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  for (let gift of giftItems) {
    let giftIndex = user.inventory.findIndex(item => item.id === gift.id);

    if (giftIndex === -1) {
      allDeposited = false;
      continue;
    }

    // Remove item from Sender
    let giftItem = user.inventory.splice(giftIndex, 1);
    if (giftItem.quantity < gift.quantity) {
      allGifted = false;
      continue;
    } else if (giftItem.quantity > gift.quantity) {
      giftItem.quantity -= gift.quantity;
      user.inventory.push(giftItem);
    }

    giftIndex = company.inventory.findIndex(item => item.id === gift.id);
    if (giftIndex === -1) {
      company.inventory.push({ id: gift.id, quantity: gift.quantity });
    } else {
      company.inventory[giftIndex].quantity += gift.quantity;
    }
  }

  // Update Company
  updates = { inventory: [...company.inventory] };
  let updated = await companies.findOneAndUpdate({ _id: compId }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update Company!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update Sender
  updates = { inventory: [...user.inventory] };
  updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update User!';
    return Promise.resolve({ status: 500, payload });
  } else if (!allDeposited) {
    payload.error = 'Not All Items Deposited!';
    payload.errorDetail = 'Insufficient quantity of items to complete one or more deposits';
    return Promise.resolve({ status: 400, payload });
  }

  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

const deposit_money = async (id, compId, donations) => {
  const users = db.getDB().collection('users');
  const companies = db.getDB().collection('companies');
  let user = await users.findOne({ _id: id });
  let allDonated = true;
  let updates = {};
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let company = await CompService.getCompany(compId);

  if (!company) {
    payload.error = 'Company Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  for (let donation of donations) {
    if (donation.currency === 'Gold') {
      if (user.gold < donation.amount) {
        allDonated = false;
        continue;
      }

      user.gold -= donation.amount;
      company.gold += donation.amount;
    } else {
      if (company.funds.currency !== donation.currency) {
        allDonated = false;
        continue;
      }

      let userCC = user.wallet.find(cc => cc.currency === donation.currency);

      if (!userCC || userCC.amount < donation.amount) {
        allDonated = false;
        continue;
      }

      userCC.amount -= donation.amount;
      company.funds.amount += donation.amount;
    }
  }

  // Update Company
  updates = { funds: { ...company.funds }, gold: company.gold };
  let updated = await companies.findOneAndUpdate({ _id: compId }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update Company!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update User
  updates = { gold: user.gold, wallet: [...user.wallet] };
  updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update User!';
    return Promise.resolve({ status: 500, payload });
  } else if (!allDonated) {
    payload.error = 'Not All Money Deposited!';
    payload.errorDetail = 'Insufficient funds for one or more deposits';
    return Promise.resolve({ status: 400, payload });
  }

  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

const withdraw_items = async (id, compId, giftItems) => {
  const users = db.getDB().collection('users');
  const companies = db.getDB().collection('companies');
  let user = await users.findOne({ _id: id });
  let allWithdrawn = true;
  let updates = {};
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let company = await CompService.getCompany(compId);

  if (!company) {
    payload.error = 'Company Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  for (let gift of giftItems) {
    let giftIndex = company.inventory.findIndex(item => item.id === gift.id);

    if (giftIndex === -1) {
      allWithdrawn = false;
      continue;
    }

    // Remove item from Company
    let giftItem = company.inventory.splice(giftIndex, 1);
    if (giftItem.quantity < gift.quantity) {
      allGifted = false;
      continue;
    } else if (giftItem.quantity > gift.quantity) {
      giftItem.quantity -= gift.quantity;
      company.inventory.push(giftItem);
    }

    giftIndex = user.inventory.findIndex(item => item.id === gift.id);
    if (giftIndex === -1) {
      user.inventory.push({ id: gift.id, quantity: gift.quantity });
    } else {
      user.inventory[giftIndex].quantity += gift.quantity;
    }
  }

  // Update User
  updates = { inventory: [...user.inventory] };
  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update User!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update Company
  updates = { inventory: [...company.inventory] };
  updated = await companies.findOneAndUpdate({ _id: compId }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update Company!';
    return Promise.resolve({ status: 500, payload });
  } else if (!allWithdrawn) {
    payload.error = 'Not All Items Withdrawn!';
    payload.errorDetail = 'Insufficient quantity of items to complete one or more withdrawals';
    return Promise.resolve({ status: 400, payload });
  }

  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

const withdraw_money = async (id, compId, donations) => {
  const users = db.getDB().collection('users');
  const companies = db.getDB().collection('companies');
  let user = await users.findOne({ _id: id });
  let allWithdrawn = true;
  let updates = {};
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let company = await CompService.getCompany(compId);

  if (!company) {
    payload.error = 'Company Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  for (let donation of donations) {
    if (donation.currency === 'Gold') {
      if (company.gold < donation.amount) {
        allWithdrawn = false;
        continue;
      }

      company.gold -= donation.amount;
      user.gold += donation.amount;
    } else {
      if (company.funds.currency !== donation.currency) {
        allWithdrawn = false;
        continue;
      }

      let userCC = user.wallet.find(cc => cc.currency === donation.currency);

      if (!userCC) {
        user.wallet.push({ currency: donation.currency, amount: donation.amount });
      } else {
        userCC.amount += donation.amount;
      }
      company.funds.amount -= donation.amount;
    }
  }

  // Update User
  updates = { gold: user.gold, wallet: [...user.wallet] };
  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update User!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update Company
  updates = { funds: { ...company.funds }, gold: company.gold };
  updated = await companies.findOneAndUpdate({ _id: compId }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update Company!';
    return Promise.resolve({ status: 500, payload });
  } else if (!allWithdrawn) {
    payload.error = 'Not All Money Withdrawn!';
    payload.errorDetail = 'Insufficient funds for one or more withdrawals';
    return Promise.resolve({ status: 400, payload });
  }

  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

const create_party = async (id, partyDetails) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (user.gold < 15.0) {
    payload.error = 'Insufficient Funds!';
    return Promise.resolve({ status: 400, payload });
  }

  // Create Party
  partyDetails.president = id;
  partyDetails.country = user.country;
  partyDetails.members = [id];
  let result = await PartyService.createParty(partyDetails)
  if (!result) {
    payload.error = 'Failed to Create Party!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update User
  let updates = { party: result.partyId, gold: user.gold - 15.0 };
  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to Update User!';
    return Promise.resolve({ status: 500, payload });
  }

  payload = { success: true, partyId: result.partyId };
  return Promise.resolve({ status: 200, payload });
}

const join_party = async (id, partyId) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let result = await PartyService.joinParty(partyId, id);
  
  if (result.error) {
    payload.error = result.error;
    return Promise.resolve({ status: result.status, payload });
  }

  let updates = { party: partyId };
  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const leave_party = async (id, partyId) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: id });
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let result = await PartyService.leaveParty(partyId, id);

  if (result.error) {
    payload.error = result.error;
    return Promise.resolve({ status: result.status, payload });
  }

  let updates = { party: 0 };
  let updated = await users.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

export default MemberService;