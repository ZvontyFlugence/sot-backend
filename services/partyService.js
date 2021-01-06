import db from './dbService';
import { format, addMonths } from 'date-fns';

let PartyService = {};

const PartyActions = {
  ADD_CONGRESS_CANDIDATE: 'ADD_CONGRESS_CANDIDATE',
  ADD_CP_CANDIDATE: 'ADD_CP_CANDIDATE',
  ADD_PP_CANDIDATE: 'ADD_PARTY_PRESIDENT_CANDIDATE',
  CONFIRM_CONGRESS_CANDIDATE: 'CONFIRM_CONGRESS_CANDIDATE',
  EDIT: 'EDIT',
  ENDORSE_CP_CANDIDATE: 'ENDORSE_CP_CANDIDATE',
  FORM_GOV: 'FORM_GOV',
  RESIGN_FROM_PP: 'RESIGN_FROM_PP',
  RESIGN_FROM_CONGRESS_ELECTION: 'RESIGN_FROM_CONGRESS_ELECTION',
  RESIGN_FROM_CP_ELECTION: 'RESIGN_FROM_CP_ELECTION',
  RESIGN_FROM_PP_ELECTION: 'RESIGN_FROM_PP_ELECTION',
  SET_VP: 'SET_VP',
  UPLOAD: 'UPLOAD',
};

PartyService.createParty = async partyData => {
  const parties = db.getDB().collection('parties');

  let numParties = await parties.estimatedDocumentCount();
  
  const party_doc = {
    ...partyData,
    _id: numParties + 1,
    image: process.env.DEFAULT_IMAGE || 'http://localhost:3000/default-comp.png',
    createdOn: new Date(Date.now()),
    description: '',
    vp: null,
  }

  const res = await parties.insertOne(party_doc);
  if (res.insertedCount === 1 && res.insertedId) {
    return { partyId: res.insertedId }
  }

  return null;
}

PartyService.updateParty = async (id, updates) => {
  const parties = db.getDB().collection('parties');
  return await parties.findOneAndUpdate({ _id: id }, { $set: updates });
}

PartyService.pushUpdate = async (id, updates) => {
  const parties = db.getDB().collection('parties');
  return await parties.findOneAndUpdate({ _id: id }, { $push: updates });
}

PartyService.getParty = async id => {
  const parties = db.getDB().collection('parties');
  return await parties.findOne({ _id: id });
}

PartyService.getParties = async () => {
  const parties = db.getDB().collection('parties');
  return await parties.find({}).toArray();
}

PartyService.joinParty = async (id, userId) => {
  let party = await PartyService.getParty(id);

  if (!party) {
    return { status: 404, error: 'Party Not Found!' }
  } else if (party.members.includes(userId)) {
    return { status: 400, error: 'Already A Party Member!' };
  }

  let updated = await PartyService.updateParty(id, { members: [...party.members, userId] });

  if (updated) {
    return { success: true }
  }

  return { status: 500, error: 'Failed to Join Party!' };
}

PartyService.leaveParty = async (id, userId) => {
  let party = await PartyService.getParty(id);

  if (!party) {
    return { status: 404, error: 'Party Not Found!' };
  } else if (!party.members.includes(userId)) {
    return { status: 400, error: 'Not A Party Member!' }
  }

  let memberIndex = party.members.findIndex(member => member === userId);
  party.members.splice(memberIndex, 1);

  if (party.president === userId) {
    party.president = null;
  } else if (party.vp === userId) {
    party.vp = null;
  } else if (party.congressMembers.includes(userId)) {
    let congressMemberIdx = party.congressMembers.findIndex(member => member === userId);
    party.congressMembers.splice(congressMemberIdx, 1);
  }
  
  let updates = {
    members: [...party.members],
    president: party.president,
    vp: party.vp,
    congressMembers: [...party.congressMembers],
  };
  let updated = await PartyService.updateParty(id, updates);

  if (updated) {
    return { success: true };
  }

  return { status: 500, error: 'Failed to Leave Party!' };
}

PartyService.handleVote = async (id, userId, candidateId) => {
  let party = await PartyService.getParty(id);

  if (!party) {
    return { status: 404, payload: { error: 'Party Not Found!' } };
  } else if (!party.members.includes(userId)) {
    return { status: 400, payload: { error: 'You are not a Party Member!' } };
  }

  let electionIndex = party.elections.length - 1;
  let candidateIndex = party.elections[electionIndex].candidates.findIndex(can => can.id === candidateId);

  if (candidateIndex === -1) {
    return { status: 404, payload: { error: 'Candidate Not Found!' } };
  }

  let votes = party.elections[electionIndex].candidates[candidateIndex].votes + 1;
  let updates = { [`elections.${electionIndex}.candidates.${candidateIndex}.votes`]: votes };
  let updated = await PartyService.updateParty(id, updates);

  if (updated) {
    return { status: 200, payload: { success: true } };
  }

  return { status: 500, payload: { error: 'Something Went Wrong' } };
}

PartyService.doAction = async (id, body) => {
  switch (body.action.toUpperCase()) {
    case PartyActions.ADD_CONGRESS_CANDIDATE:
      return await add_congress_candidate(id, body.data);
    case PartyActions.ADD_CP_CANDIDATE:
      return await add_cp_candidate(id, body.data);
    case PartyActions.ADD_PP_CANDIDATE:
      return await add_pp_candidate(id, body.userId);
    case PartyActions.CONFIRM_CONGRESS_CANDIDATE:
      return await confirm_congress_candidate(id, body.userId);
    case PartyActions.EDIT:
      return await edit_party(id, body.updates);
    case PartyActions.ENDORSE_CP_CANDIDATE:
      return await endorse_cp_candidate(id, body.candidateId);
    case PartyActions.FORM_GOV:
      return await form_gov(id, body.government, body.pp);
    case PartyActions.RESIGN_FROM_CONGRESS_ELECTION:
      return await resign_from_congress_election(id, body.userId);
    case PartyActions.RESIGN_FROM_CP_ELECTION:
      return await resign_from_cp_election(id, body.userId);
    case PartyActions.RESIGN_FROM_PP:
      return await resign_from_pp(id, body.userId);
    case PartyActions.RESIGN_FROM_PP_ELECTION:
      return await resign_from_pp_election(id, body.userId);
    case PartyActions.SET_VP:
      return await set_vp(id, body.userId, body.memberId);
    case PartyActions.UPLOAD:
      return await upload(id, body.image);
    default:
      const payload = { error: 'Unsupported Action!' };
      return Promise.resolve({ status: 400, payload });
  }
}

const edit_party = async (id, updates) => {
  let updated = await PartyService.updateParty(id, updates);

  if (updated) {
    return Promise.resolve({ status: 200, payload: { success: true } });
  }

  return Promise.resolve({ status: 500, payload: { error: 'Something Went Wrong!' } });
}

const upload = async (id, image) => {
  const parties = db.getDB().collection('parties');

  if (!image) {
    const payload = { error: 'No Image Provided!' };
    return Promise.resolve({ status: 400, payload });
  }

  let updated = await parties.findOneAndUpdate({ _id: id }, { $set: { image } });
  
  if (updated) {
    return Promise.resolve({ status: 200, payload: { success: true } });
  }

  return Promise.resolve({ status: 500, payload: { error: 'Something Went Wrong!' } });
}

const add_pp_candidate = async (id, userId) => {
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let electionIndex = party.elections.length - 1;
  let updates = { [`elections.${electionIndex}.candidates`]: { id: userId, votes: 0 } };
  let updated = await PartyService.pushUpdate(id, updates);

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const resign_from_pp = async (id, userId) => {
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  if (party.president !== userId) {
    payload.error = 'You Are Not Party President!';
    return Promise.resolve({ status: 400, payload });
  }

  if (party.vp !== null) {
    party.president = party.vp;
    party.vp = null;
  } else {
    party.president = null;
  }

  let updates = { president: party.president, vp: party.vp };
  let updated = await PartyService.updateParty(id, updates);

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const resign_from_pp_election = async (id, userId) => {
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let electionIndex = party.elections.length - 1;
  let candidateIndex = party.elections[electionIndex].candidates.find(can => can.id === userId);

  if (candidateIndex === -1) {
    payload.error = 'You Are Not A Candidate!';
    return Promise.resolve({ status: 400, payload });
  }

  party.elections[electionIndex].candidates.splice(candidateIndex, 1);
  let updates = { [`elections.${electionIndex}.candidates`]: [...party.elections[electionIndex].candidates] };
  let updated = await PartyService.updateParty(id, updates);

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const set_vp = async (id, userId, memberId) => {
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (party.president !== userId) {
    payload.error = 'You cannot set the VPP!';
    return Promise.resolve({ status: 400, payload });
  } else if (!party.members.includes(memberId)) {
    payload.error = 'User is not a Party Member!';
    return Promise.resolve({ status: 400, payload });
  } else if (party.vp === memberId) {
    payload.error = 'User Is Already VPP!';
    return Promise.resolve({ status: 400, payload });
  }

  let updated = await PartyService.updateParty(id, { vp: memberId });
  
  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const form_gov = async (id, government, pp) => {
  const countries = db.getDB().collection('countries');
  const users = db.getDB().collection('users');
  let party = await PartyService.getParty(id);
  let allUpdated = true;
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (!party.members.includes(pp)) {
    payload.error = 'Invalid Party President Replacement!';
    payload.errorDetail = 'Chosen replacement isn\'t a party member!';
    return Promise.resolve({ status: 400, payload });
  } else if (government.president !== party.president) {
    payload.error = 'You are cannot take this action!';
    payload.errorDetail = 'You are not the Party President!';
    return Promise.resolve({ status: 400, payload });
  }

  let updates = { president: pp, vp: null };
  let updated = await PartyService.updateParty(id, updates);

  if (!updated) {
    // error
    payload.error = 'Something Went Wrong!';
    payload.errorDetail = 'Failed to update Party!';
    return Promise.resolve({ status: 500, payload });
  }

  // Update all affected users w/ alert
  let alert = { read: false, type: 'GOV_FORMED', timestamp: new Date(Date.now()) };
  alert.message = 'You have become the Country President in the newly formed government!';
  updated = await users.updateOne({ _id: government.president }, { $push: { ['alerts']: alert } });

  if (!updated) {
    payload.error = 'Not All Users Updated!';
    payload.errorDetail = 'Failed to update all users and country!';
    return Promise.resolve({ status: 500, payload });
  }

  if (government.vp) {
    alert.message = 'You have become the Vice Country President in the newly formed government!';
    updated = await users.updateOne({ _id: government.vp }, { $push: { ['alerts']: alert } });

    if (!updated) {
      payload.error = 'Not All Users Updated!';
      payload.errorDetail = 'Failed to update VP, Cabinet, Congress, and Country!';
      return Promise.resolve({ status: 500, payload });
    }
  }

  for (let position in government.cabinet) {
    let positionTitle = undefined;
    switch (position) {
      case 'mofa':
        positionTitle = 'Minister of Foreign Affairs';
        break;
      case 'mod':
        alert.message = 'Minister of Defense';
      case 'mot':
        alert.message = 'Minister of the Treasury';
      default:
        break;
    }

    if (!positionTitle) break;

    alert.message = `You have become the ${positionTitle} in the newly formed government!`;

    updated = await users.updateOne({ _id: government.cabinet[position] }, { $push: { ['alerts']: alert } });

    if (!updated)
      allUpdated = false;
  }

  if (!allUpdated) {
    payload.error = 'Not All Users Updated!';
    payload.errorDetail = 'Failed to update Cabinet, Congress, and Country!';
    return Promise.resolve({ status: 500, payload });
  }

  alert.message = 'You have become a member of Congress in the newly formed government!';
  updated = await users.updateMany({ _id: { $in: government.congress } }, { $push: { ['alerts']: alert }});

  if (!updated) {
    payload.error = 'Not All Users Updated!';
    payload.errorDetail = 'Failed to update Congress and Country!';
    return Promise.resolve({ status: 500, payload });
  }

  updates = { government };
  updated = await countries.updateOne({ _id: party.country }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  payload.errorDetail = 'Failed to update country!';
  return Promise.resolve({ status: 500, payload });
}

const add_congress_candidate = async (id, data) => {
  const countries = db.getDB().collection('countries');
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (!party.members.includes(data.candidateID)) {
    payload.error = 'Candidate is not a Party Member!';
    return Promise.resolve({ status: 400, payload });
  }

  let country = await countries.findOne({ _id: party.country });

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let electionIndex = country.congressElections.length - 1;
  let updates = {
    [`congressElections.${electionIndex}.candidates`]: {
      id: data.candidateID,
      region: data.regionID,
      party: id,
      confirmed: false,
    }
  };

  let updated = await countries.updateOne({ _id: party.country }, { $push: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const add_cp_candidate = async (id, data) => {
  const countries = db.getDB().collection('countries');
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  } else if (!party.members.includes(data.candidateID)) {
    payload.error = 'Candidate is not a Party Member!';
    return Promise.resolve({ status: 400, payload });
  }

  let country = await countries.findOne({ _id: party.country });

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let electionIndex = country.presidentElections.length - 1;
  let updates = {
    [`presidentElections.${electionIndex}.candidates`]: {
      id: data.candidateID,
      party: id,
      endorsed: [],
    }
  };

  let updated = await countries.updateOne({ _id: party.country }, { $push: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const resign_from_congress_election = async (id, userId) => {
  const countries = db.getDB().collection('countries');
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let country = await countries.findOne({ _id: party.country });

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let electionIndex = country.congressElections.length - 1;
  let candidateIndex = country.congressElections[electionIndex].candidates.findIndex(can => can.id === userId);

  if (candidateIndex === -1) {
    payload.error = 'You are not a Candidate!';
    return Promise.resolve({ status: 400, payload });
  }

  country.congressElections[electionIndex].candidates.splice(candidateIndex, 1);
  let updates = { [`congressElections.${electionIndex}.candidates`]: [...country.congressElections[electionIndex].candidates] };
  let updated = await countries.updateOne({ _id: party.country }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const resign_from_cp_election = async (id, userId) => {
  const countries = db.getDB().collection('countries');
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let country = await countries.findOne({ _id: party.country });

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let electionIndex = country.presidentElections.length - 1;
  let candidateIndex = country.presidentElections[electionIndex].candidates.findIndex(can => can.id === userId);

  if (candidateIndex === -1) {
    payload.error = 'You are not a Candidate!';
    return Promise.resolve({ status: 400, payload });
  }

  country.presidentElections[electionIndex].candidates.splice(candidateIndex, 1);
  let updates = { [`presidentElections.${electionIndex}.candidates`]: [...country.presidentElections[electionIndex].candidates] };
  let updated = await countries.updateOne({ _id: party.country }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

const confirm_congress_candidate = async (id, userId) => {
  const countries = db.getDB().collection('countries');
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let country = await countries.findOne({ _id: party._id });

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let electionIndex = country.congressElections.length - 1;
  let candidateIndex = country.congressElections[electionIndex].candidates.findIndex(can => can.id === userId);

  if (candidateIndex === -1) {
    payload.error = 'User is not a Candidate!';
    return Promise.resolve({ status: 400, payload });
  }

  let updates = {
    [`congressElections.${electionIndex}.candidates.${candidateIndex}`]: {
      ...country.congressElections[electionIndex].candidates[candidateIndex],
      votes: 0,
      confirmed: true,
    }
  };

  let updated = await countries.updateOne({ _id: party.country }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}  

const endorse_cp_candidate = async (id, candidateId) => {
  const countries = db.getDB().collection('countries');
  const users = db.getDB().collection('users');
  let party = await PartyService.getParty(id);
  let payload = {};

  if (!party) {
    payload.error = 'Party Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let country = await countries.findOne({ _id: party.country });

  if (!country) {
    payload.error = 'Country Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let electionIndex = country.presidentElections.length - 1;
  let candidateIndex = country.presidentElections[electionIndex].candidates.findIndex(can => can.id === candidateId);

  if (candidateIndex === -1) {
    payload.error = 'User is not a Candidate!';
    return Promise.resolve({ status: 400, payload });
  }

  let updates = {
    [`presidentElections.${electionIndex}.candidates.${candidateIndex}`]: {
      ...country.presidentElections[electionIndex].candidates[candidateIndex],
      votes: 0,
      endorsed: [...country.presidentElections[electionIndex].candidates[candidateIndex].endorsed, id],
    }
  };

  let alert = {
    read: false,
    type: `ENDORSED`,
    message: `You have been endorsed by the ${party.name} for Country President!`,
    timestamp: new Date(Date.now()),
  };

  let updated = await users.updateOne({ _id: candidateId }, { $push: { alerts: alert } });

  if (!updated) {
    payload.error = 'Failed to Endorse Candidate!';
    paylor.errorDetail = 'Candidate could not be notified. Please try again.'
    return Promise.resolve({ status: 500, payload });
  }

  updated = await countries.updateOne({ _id: party.country }, { $set: updates });

  if (updated) {
    payload.success = true;
    return Promise.resolve({ status: 200, payload });
  }

  payload.error = 'Something Went Wrong!';
  return Promise.resolve({ status: 500, payload });
}

export default PartyService;
