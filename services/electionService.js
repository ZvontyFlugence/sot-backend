import { format } from 'date-fns';
import db from './dbService';
import MemberService from './memberService';
import CountryService from './countryService';
import PartyService from './partyService';
import RegionService from './regionService';

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

  let updated = await countries.updateMany({}, { $push: { presidentElections: election_doc } });

  if (updated) {
    console.log('Country President Elections Created...');
  }
}

ElectionService.createCongressElection = async () => {
  let now = new Date(Date.now());
  now.setMonth(now.getMonth() + 1);
  let date = format(now, 'MMM yyyy');
  const countries = db.getDB().collection('countries');

  let election_doc = {
    active: false,
    date,
    winners: [],
    candidates: [],
  };

  let updated = await countries.updateMany({}, { $push: { congressElections: election_doc } });

  if (updated) {
    console.log('Congress Elections Created...');
  }
}

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
  console.log('Activating Country Elections...');
  const countriesColl = db.getDB().collection('countries');
  let countries = await CountryService.getCountries();
  let allUpdated = true;

  countries.forEach(async country => {
    let electionIndex = country.presidentElections.length - 1;
    let candidates = country.presidentElections[electionIndex].candidates.filter(can => can.endorsed.length > 0);
    let updated = await countriesColl.updateMany({}, {
      $set: {
        [`presidentElections.${electionIndex}.active`]: true,
        [`presidentElections.${electionIndex}.finished`]: false,
        [`presidentElections.${electionIndex}.candidates`]: candidates,
        [`presidentElections.${electionIndex}.system`]: country.government.electionSystem,
      }
    });

    if (!updated) {
      allUpdated = false;
    }
  });

  if (allUpdated) {
    console.log('Country President Elections Activated...');
  } else {
    console.log('Not All Activated...');
  }
}

ElectionService.activateCongressElection = async () => {
  const countriesColl = db.getDB().collection('countries');
  let countries = await CountryService.getCountries();
  let allUpdated = true;

  countries.forEach(async country => {
    let electionIndex = country.congressElections.length - 1;
    let candidates = country.congressElections[electionIndex].candidates.filter(can => can.confirmed);
    let updated = await countriesColl.updateMany({}, {
      $set: {
        [`congressElections.${electionIndex}.active`]: true,
        [`congressElections.${electionIndex}.finished`]: false,
        [`congressElections.${electionIndex}.candidates`]: candidates,
      }
    });

    if (!updated) {
      allUpdated = false;
    }
  });

  if (allUpdated) {
    console.log('Congress Elections Activated...');
  }
}

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
  const users = db.getDB().collection('users');
  const countriesColl = db.getDB().collection('countries');
  let countries = await CountryService.getCountries();
  let allUpdated = true;

  countries.forEach(async country => {
    let electionIndex = country.presidentElections.length-1;
    let election = country.presidentElections[electionIndex];
    let maxVotes = 0;
    let maxIndex = [];
    let winner = 0;
    let candidateTallies = {};
    let ecResults = {};

    if (election.system === 'Popular Vote') {
      // Popular Vote System
      for (let candidate of election.candidates) {
        let votes = candidate.votes.reduce((accum, voteObj) => accum + voteObj.tally, 0);
        if (votes > maxVotes) {
          maxVotes = votes;
          maxIndex = [candidate.id];
        } else if (votes === maxVotes) {
          maxIndex.push(candidate.id);
        }
      }

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
    } else if (election.system === 'Electoral College') {
      // Electoral College System
      let regions = [];
      let votes = {};
      // Get each regions per-candidate results
      for (let candidate of election.candidates) {
        for (let voteObj of candidate.votes) {
          if (!regions.includes(voteObj.region)) {
            regions.push(voteObj.region);
            votes[voteObj.region] = { [candidate.id]: voteObj.tally };
          } else {
            let index = regions.findIndex(reg => reg === voteObj.region);
            votes[index][candidate.id] = voteObj.tally;
          }
        }
      }
      
      // Compare candidate results in each region to decide region winner
      let regionWinners = [];
      for (let region of regions) {
        let regionWinner = null;
        let regionMaxVotes = 0;
        for (let candidate in votes[region]) {          
          if (votes[region][candidate] > regionMaxVotes) {
            regionMaxVotes = votes[region][candidate];
            regionWinner = candidate;
          } else if (votes[region][candidate] === regionMaxVotes) {
            let canA = await MemberService.getUser(regionWinner);
            let canB = await MemberService.getUser(candidate);

            if (canB && canA && canB.xp > canA.xp) {
              regionWinner = candidate;
            }
          }
        }
        regionWinners.push(regionWinner);
        ecResults[region] = votes[region];
      }

      // Tally total votes for each regionWinner
      let finalTally = [];
      let countryPop = await CountryService.getPopulation(country._id);
      for (let region of regions) {
        let regionCitizens = await users.find({ country: country._id, location: region }).toArray();
        let regionPop = regionCitizens.length;
        let percent = (regionPop / countryPop);
        let tally = Math.round(country.government.totalElectoralVotes * percent);
        finalTally.push(tally);
      }

      // Sum total votes for each candidate
      for (let region of regions) {
        let index = regions.findIndex(reg => reg === region);
        let winningCandidate = regionWinners[index];
        if (!candidateTallies[winningCandidate]) {
          candidateTallies[winningCandidate] = finalTally[index];
        } else {
          candidateTallies[winningCandidate] += finalTally[index];
        }
      }

      // Decide election winner by votes or xp in the case of a tie
      let winningCandidate = null;
      let maxVotes = 0;
      for (let candidate in candidateTallies) {
        if (candidateTallies[candidate] > maxVotes) {
          maxVotes = candidateTallies[candidate];
          winningCandidate = candidate;
        } else if (candidateTallies[candidate] === maxVotes) {
          let canA = await MemberService.getUser(winningCandidate);
          let canB = await MemberService.getUser(candidate);

          if (canB && canA && canB.xp > canA.xp) {
            winningCandidate = candidate;
          }
        }
      }

      winner = winningCandidate;
    }

    if (typeof winner === 'string') {
      winner = Number.parseInt(winner);
    }

    if (winner && winner !== 0) {
      let alert = {
        read: false,
        type: 'ELECTED_CP',
        message: 'You have been elected as Country President and awarded 5 Gold!',
        timestamp: new Date(Date.now()),
      };
      let winningUser = await MemberService.getUser(winner);
      let gold = winningUser.gold + 5.00;
      let alerts = [...winningUser.alerts, alert];
      let updated = await users.updateOne({ _id: winner }, { $set: { gold, alerts } });
      if (!updated) {
        allUpdated = false;
      }
    }

    let updated = await countriesColl.updateOne({ _id: country._id }, {
      $set: {
        ['government.president']: winner !== 0 ? winner : null,
        [`government.vp`]: null,
        [`government.cabinet`]: { mofa: null, mod: null, mot: null },
        [`presidentElections.${electionIndex}.active`]: false,
        [`presidentElections.${electionIndex}.finished`]: true,
        [`presidentElections.${electionIndex}.winner`]: winner !== 0 ? winner : null,
        [`presidentElections.${electionIndex}.tally`]: election.system === 'Electoral College' ? candidateTallies : undefined,
        [`presidentElections.${electionIndex}.ecResults`]: election.system === 'Electoral College' ? ecResults : undefined,
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

ElectionService.closeCongressElection = async () => {
  const countriesColl = db.getDB().collection('countries');
  let countries = await CountryService.getCountries();
  let allUpdated = true;

  countries.forEach(async country => {
    let electionIndex = country.congressElections.length - 1;
    let election = country.congressElections[electionIndex];
    let regions = {};

    // Separate candidates by region
    for (let candidate of election.candidates) {
      if (!regions[candidate.region]) {
        regions[candidate.region] = [];
      }
      regions[candidate.region].push(candidate);
    }

    // Sort candidates by votes descending
    for (let region in regions) {
      regions[region].sort(async (canA, canB) => {
        if (canB.votes === canA.votes) {
          let b = await MemberService.getUser(canB.id);
          let a = await MemberService.getUser(canA.id);
          return b.xp - a.xp;
        }

        return canB.votes - canA.votes
      });
    }

    // Assign Seats
    let seatsAvailable = country.government.congressSeats;
    let regionWinners = {};
    while (seatsAvailable > 0) {
      let prevSeatsAvail = seatsAvailable;
      for (let region in regions) {
        if (!regionWinners[region]) {
          regionWinners[region] = [];
        }

        if (seatsAvailable > 0) {
          regionWinners[region].push(regions[region].shift());
          seatsAvailable--;
        } else {
          break;
        }
      }

      // Check if no remaining candidates
      if (seatsAvailable === prevSeatsAvail) {
        break;
      }
    }

    // Reduce each region's winner array into single array representing congress members
    let congress = Object.values(regionWinners).reduce((accum, currVal) => {
      let winners = currVal.map(candidate => candidate.id);
      return [...accum, ...winners];
    }, []);

    let updated = await countriesColl.updateOne({ _id: country._id }, {
      $set: {
        ['government.congress']: congress,
        [`congressElections.${electionIndex}.active`]: false,
        [`congressElections.${electionIndex}.finished`]: true,
        [`congressElections.${electionIndex}.winners`]: congress,
      }
    });

    if (!updated) {
      allUpdated = false;
    }
  });

  if (allUpdated) {
    console.log('Congress Elections Concluded...');
  }
}

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

  let updates = { canVote: new Date(new Date().setUTCHours(24, 0, 0, 0)) };
  let updated = await users.updateOne({ _id: userId }, { $set: updates });
  if (!updated) {
    payload.error = 'Something Went Wrong!';
    return Promise.resolve({ status: 500, payload });
  }

  switch (data.scope) {
    case 'congress':
      let result = await RegionService.handleVote(user.residence, data.candidate);
      if (!result) {
        payload.error = 'Something Went Wrong!';
        return Promise.resolve({ status: 500, payload });
      }
      return Promise.resolve(result);
    case 'president':
      result = await CountryService.handleVote(user.country, user.residence, userId, data.candidate);
      if (!result) {
        payload.error = 'Something Went Wrong!';
        return Promise.resolve({ status: 500, payload });
      }
      return Promise.resolve(result);
    case 'party':
      result = await PartyService.handleVote(user.party, userId, data.candidate);
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