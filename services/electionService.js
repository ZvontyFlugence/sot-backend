import { format } from 'date-fns';
import db from './dbService';
import MemberService from './memberService';
import CountryService from './countryService';
import PartyService from './partyService';

const ElectionService = {};

ElectionService.createCountryElection = async () => {
  let now = new Date(Date.now());
  now.setMonth(now.getMonth() + 1);
  let date = format(now, 'MMM yyyy');
  const countries = db.getDB().collection('countries');

  let election_doc = {
    active: false,
    date,
    winner: 0,
    candidates: [],
  };

  let updated = await countries.updateMany({}, { $push: { elections: election_doc } });

  if (updated) {
    console.log('Country President Elections Created...');
  }
}

ElectionService.createCongressElection = async () => {}

ElectionService.createPartyElection = async () => {
  let now = new Date(Date.now());
  now.setMonth(now.getMonth() + 1);
  let date = format(now, 'MMM yyyy');
  const parties = db.getDB().collection('parties');

  let election_doc = {
    active: false,
    date,
    winner: 0,
    candidates: [],
  };

  let updated = await parties.updateMany({}, { $push: { elections: election_doc } });

  if (updated) {
    console.log('Party President Elections Created...');
  }
}

ElectionService.activateCountryElection = async () => {
  const countriesColl = db.getDB().collection('countries');
  let countries = await CountryService.getCountries();
  let allUpdated = true;

  countries.forEach(async country => {
    let electionIndex = country.elections.length - 1;
    let updated = await countriesColl.updateMany({}, {
      $set: {
        [`elections.${electionIndex}.active`]: true,
        [`elections.${electionIndex}.finished`]: false,
      }
    });

    if (!updated) {
      allUpdated = false;
    }
  });

  

  if (allUpdated) {
    console.log('Country President Elections Activated...');
  }
}

ElectionService.activateCongressElection = async () => {}

ElectionService.activatePartyElection = async () => {
  const partiesColl = db.getDB().collection('parties');
  let parties = await partiesColl.find({}).toArray();
  let allUpdated = true;

  parties.forEach(async party => {
    let electionIndex = party.elections.length - 1;
    let updated = await partiesColl.updateMany({}, {
      $set: {
        [`elections.${electionIndex}.active`]: true,
        [`elections.${electionIndex}.finished`]: false,
      }
    });

    if (!updated) {
      allUpdated = false;
    }
  });

  if (allUpdated) {
    console.log('Party President Elections Activated...');
  }
}

ElectionService.closeCountryElection = async () => {
  const countriesColl = db.getDB().collection('countries');
  let countries = await CountryService.getCountries();
  let allUpdated = true;

  countries.forEach(async country => {
    let electionIndex = country.elections.length-1;
    let election = country.elections[electionIndex];
    let maxVotes = 0;
    let maxIndex = [];

    for (let candidate of election.candidates) {
      let votes = candidate.votes.reduce((accum, voteObj) => accum + voteObj.tally);
      if (votes > maxVotes) {
        maxVotes = votes;
        maxIndex = [candidate.id];
      } else if (votes === maxVotes) {
        maxIndex.push(candidate.id);
      }
    }

    let winner = 0;
    if (maxIndex.length === 1)
      winner = maxIndex[0];
    else {
      let maxXP = 0;
      for (let userId of maxIndex) {
        let user = await MemberService.getUser(userId);
        if (user.xp > maxXP) {
          maxXP = user.xp;
          winner = user._id;
        }
      }
    }

    let updated = await countriesColl.updateOne({ _id: country._id }, {
      $set: {
        president: winner !== 0 ? winner : null,
        [`elections.${electionIndex}.active`]: false,
        [`elections.${electionIndex}.finished`]: true,
        [`elections.${electionIndex}.winner`]: winner,
      }
    });

    if (!updated) {
      allUpdated = false;
    }
  });

  if (allUpdated) {
    console.log('Country President Elections Concluded...');
  }
}

ElectionService.closeCongressElection = async () => {}

ElectionService.closePartyElection = async () => {
  const partiesColl = db.getDB().collection('parties');
  let parties = await partiesColl.find({}).toArray();
  let allUpdated = true;

  parties.forEach(async party => {
    let electionIndex = party.elections.length - 1;
    let election = party.elections[electionIndex];
    let maxVotes = 0;
    let maxIndex = [];

    for (let candidate of election.candidates) {
      if (candidate.votes > maxVotes) {
        maxVotes = candidate.votes;
        maxIndex = [candidate.id];
      } else if (candidate.votes === maxVotes) {
        maxIndex.push(candidate.id);
      }
    }

    let winner = 0;
    if (maxIndex.length === 1) {
      winner = maxIndex[0];
    } else {
      let maxXP = 0;
      for (let userId of maxIndex) {
        let user = await MemberService.getUser(userId);
        if (user.xp > maxXP) {
          maxXP = user.xp;
          winner = user._id;
        }
      }
    }

    let updated = await partiesColl.updateOne({ _id: party._id }, {
      $set: {
        president: winner !== 0 ? winner : null,
        [`elections.${electionIndex}.active`]: false,
        [`elections.${electionIndex}.finished`]: true,
        [`elections.${electionIndex}.winner`]: winner,
      }
    });

    if (!updated)
      allUpdated = false;
  });

  if (allUpdated)
    console.log('Party President Elections Concluded...');
}

ElectionService.vote = async (userId, data) => {
  const users = db.getDB().collection('users');
  let user = await users.findOne({ _id: userId });
  let payload = {};

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  switch (data.scope) {
    case 'party':
      let updates = { canVote: new Date(new Date().setUTCHours(24, 0, 0, 0)) };
      let updated = await users.updateOne({ _id: userId }, { $set: updates });
      if (!updated) {
        payload.error = 'Something Went Wrong!';
        return Promise.resolve({ status: 500, payload });
      }

      let result = await PartyService.handleVote(user.party, userId, data.candidate);
      if (!result) {
        payload.error = 'Something Went Wrong!';
        return Promise.resolve({ status: 500, payload });
      }
      return Promise.resolve(result);
    default:
      payload = { error: 'Unsupported Voting Scope!' };
      return Promise.resolve({ status: 400, payload });
  }
}

export default ElectionService;