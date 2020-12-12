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

export default CountryService;