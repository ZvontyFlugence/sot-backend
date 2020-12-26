import db from './dbService';

const CountryService = {};

CountryService.getCountries = async () => {
  const countries = db.getDB().collection('countries');
  return await countries.find({}).toArray();
};

CountryService.getCountry = async id => {
  const countries = db.getDB().collection('countries');
  return await countries.findOne({ _id: id });
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
  return owned_regions;
}

CountryService.getParties = async id => {
  let parties = db.getDB().collection('parties');
  return await parties.find({ country: id }).toArray();
}

export default CountryService;