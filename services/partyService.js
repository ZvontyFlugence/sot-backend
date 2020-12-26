import db from './dbService';

let PartyService = {};

const PartyActions = {
  ADD_PP_CANDIDATE: 'ADD_PARTY_PRESIDENT_CANDIDATE',
  EDIT: 'EDIT',
  RESIGN_FROM_PP: 'RESIGN_FROM_PP',
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
    congressMembers: [],
    presidentElections: [],
    congressElections: [],
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
    case PartyActions.ADD_PP_CANDIDATE:
      return await add_pp_candidate(id, body.userId);
    case PartyActions.EDIT:
      return await edit_party(id, body.updates);
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

export default PartyService;