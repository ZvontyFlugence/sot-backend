import db from './dbService';

const CountryService = {};

CountryService.getCountries = async () => {
  const countriesColl = db.getDB().collection('countries');
  let countries = await countriesColl.find({}).toArray();

  countries.forEach(async country => {
    let regions = await CountryService.getRegions(country._id);
    let congressSeats = 10;
    if (regions && regions.length <= 25) {
      congressSeats = regions.length * 2;
    } else if (regions && regions.length > 25) {
      congressSeats = 50 + (regions.length - 25);
    }

    if (country.government) {
      country.government.congressSeats = congressSeats;
    }
  });

  return countries;
};

CountryService.getCountry = async id => {
  const countries = db.getDB().collection('countries');
  let country = await countries.findOne({ _id: id });

  let regions = await CountryService.getRegions(id);
  let congressSeats = 10;
  if (regions && regions.length <= 25) {
    congressSeats = regions.length * 2;
  } else if (regions && regions.length > 25) {
    congressSeats = 50 + (regions.length - 25);
  }

  country.government.congressSeats = congressSeats;
  return country;
};

CountryService.getCountryByFlagCode = async flag_code => {
  const countries = db.getDB().collection('countries');
  return await countries.findOne({ flag_code });
};

CountryService.getCitizens = async id => {
  const users = db.getDB().collection('users');
  return await users.find({ country: id }).toArray();
};

CountryService.getPopulation = async id => {
  let citizens = await CountryService.getCitizens(id);

  if (citizens) {
    return Promise.resolve(citizens.length);
  }
  return Promise.resolve(0);
};

CountryService.getAverageLevel = async id => {
  let citizens = await CountryService.getCitizens(id);
  let levelSum = citizens.reduce((accum, citizen) => accum + citizen.level, 0);
  return citizens.length > 0 ? Math.round(levelSum / citizens.length) : 0;
}

CountryService.getNumNewCitizens = async id => {
  let citizens = await CountryService.getCitizens(id);
  let today = new Date(Date.now());
  let newCitizens = citizens.filter(citizen => {
    let born = new Date(citizen.createdOn);
    let bornToday = (born.getUTCDate() === today.getUTCDate()) &&
      (born.getUTCMonth() === today.getUTCMonth()) &&
      (born.getUTCFullYear() === today.getUTCFullYear());

    return bornToday;
  });

  return newCitizens.length;
}

CountryService.getJobs = async id => {
  let regions = await db.getDB().collection('regions').find({ owner: id }).toArray();
  let companies = [];
  let jobOffers = [];

  for (let i = 0; i < regions.length; i++) {
    let region_comps = await db.getDB().collection('companies').find({ location: regions[i]._id }).toArray();
    companies = [...companies, ...region_comps];
  }

  companies.forEach(comp => {
    jobOffers.push(...comp.jobOffers.map(offer => {
      return {
        ...offer,
        comp: {
          _id: comp._id,
          name: comp.name,
          image: comp.image,
          type: comp.type,
        },
      };
    }));
  });

  return Promise.resolve(jobOffers);
}

CountryService.getGoods = async id => {
  let regions = await db.getDB().collection('regions').find({ owner: id }).toArray();
  let companies = [];
  let productOffers = [];

  for (let i = 0; i < regions.length; i++) {
    let region_comps = await db.getDB().collection('companies').find({ location: regions[i]._id }).toArray();
    companies = [...companies, ...region_comps];
  }

  companies.forEach(comp => {
    productOffers.push(...comp.productOffers.map(offer => {
      return {
        ...offer,
        comp: {
          _id: comp._id,
          name: comp.name,
          image: comp.image,
          type: comp.type,
        },
      };
    }));
  });

  return Promise.resolve(productOffers);
}

CountryService.getRegions = async id => {
  const regions = db.getDB().collection('regions');
  let owned_regions = await regions.find({ owner: id }).toArray();

  owned_regions.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    } else {
      return 0;
    }
  });

  return Promise.resolve(owned_regions);
}

CountryService.getParties = async id => {
  let parties = db.getDB().collection('parties');
  return await parties.find({ country: id }).toArray();
}

CountryService.handleVote = async (id, regionId, userId, candidateId) => {
  const regions = db.getDB().collection('regions');
  const countries = db.getDB().collection('countries');
  let country = await CountryService.getCountry(id);
  let updates = {};

  if (!country) {
    return { status: 404, payload: { error: 'Country Not Found!' } };
  }

  let region = await regions.findOne({ _id: regionId });

  if (!region) {
    return { status: 404, payload: { error: 'Region Not Found!' } };
  } else if (region.owner !== id) {
    return { status: 400, payload: { error: 'Invalid Voting Region!' } };
  }

  let electionIndex = country.presidentElections.length - 1;
  let candidateIndex = country.presidentElections[electionIndex].candidates.findIndex(can => can.id === candidateId);

  if (candidateIndex === -1) {
    return { status: 404, payload: { error: 'Candidate Not Found!' } };
  }

  let votesIndex = country.presidentElections[electionIndex].candidates[candidateIndex].votes.findIndex(voteObj => voteObj.region === regionId);

  if (votesIndex === -1) {
    updates = {
      [`presidentElections.${electionIndex}.candidates.${candidateIndex}.votes`]: {
        region: regionId,
        users: [userId],
        tally: 1,
      },
    };

    // Push update
    let updated = await countries.updateOne({ _id: id }, { $push: updates });

    if (updated) {
      return { status: 200, payload: { success: true } };
    }

    return { status: 500, payload: { error: 'Something Went Wrong!' } };
  } else {
    updates = {
      [`presidentElections.${electionIndex}.candidates.${candidateIndex}.votes.${votesIndex}.tally`]:
        country.presidentElections[electionIndex].candidates[candidateIndex].votes[votesIndex].tally + 1,
      [`presidentElections.${electionIndex}.candidates.${candidateIndex}.votes.${votesIndex}.users`]:
        [...country.presidentElections[electionIndex].candidates[candidateIndex].votes[votesIndex].users, userId],
    };

    // Set Update
    let updated = await countries.updateOne({ _id: id }, { $set: updates });

    if (updated) {
      return { status: 200, payload: { success: true } };
    }

    return { status: 500, payload: { error: 'Something Went Wrong!' } };
  }
}

export default CountryService;