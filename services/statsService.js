import MemberService from './memberService';
import CountryService from './countryService';
import PartyService from './partyService';
import NewsService from './newsService';

const StatsService = {};

const CitizenStats = {
  STRENGTH: 'STRENGTH',
  XP: 'XP',
};

const CountryStats = {
  POPULATION: 'POPULATION',
};

StatsService.getCitizenStats = async body => {
  let citizens = null;
  if (body.country && body.country !== 'global')
    citizens = await citizensByCountry(body.country);
  else
    citizens = await citizensGlobal();

  if (!citizens) {
    let payload = { err: 'Something Unexpected Happened' };
    return Promise.resolve({ status: 500, payload });
  }

  switch (body.stat.toUpperCase()) {
    case CitizenStats.STRENGTH:
    case CitizenStats.XP:
      citizens.sort((a, b) => b[body.stat] - a[body.stat]);
      break;
    default:
      let payload = { err: 'Unsupported Stat' };
      return Promise.resolve({ status: 400, payload });
  }

  if (body.hasOwnProperty('limit')) {
    citizens = citizens.slice(0, body.limit);
  }

  return Promise.resolve({ status: 200, payload: { citizens } });
};

const citizensByCountry = async country_id => {
  let country = await CountryService.getCountry(country_id);
  let users = await CountryService.getCitizens(country_id);

  return users.map(u => {
    u.country = { _id: country._id, name: country.name, flag: country.flag_code };
    return u;
  });
};

const citizensGlobal = async () => {
  let user_result = await MemberService.getAllUsers();
  const { users } = user_result.payload;

  return await Promise.all(users.map(async u => {
    let country = await CountryService.getCountry(u.country);
    u.country = { _id: country._id, name: country.name, flag: country.flag_code };
    return u;
  }));
};

StatsService.getCountryStats = async body => {
  let countries = await CountryService.getCountries();
  
  if (!countries) {
    let payload = { error: 'Something Unexpected Happened' };
    return Promise.resolve({ status: 500, payload });
  }

  switch (body.stat.toUpperCase()) {
    case CountryStats.POPULATION:
      countries = await Promise.all(countries.map(async c => {
        c.population = await CountryService.getPopulation(c._id);
        return c;
      }));
      countries.sort((a, b) => b[body.stat] - a[body.stat]);
      break;
    default:
      let payload = { error: 'Unsupported Country Stat' };
      return Promise.resolve({ status: 400, payload });
  }

  if (body.hasOwnProperty('limit')) {
    countries = countries.slice(0, body.limit);
  }

  return Promise.resolve({ status: 200, payload: { countries } });
}

StatsService.getPartyStats = async body => {
  let parties = null;

  if (body.country && body.country !== 'global') {
    parties = await CountryService.getParties(body.country);
    let country = await CountryService.getCountry(body.country);

    parties.forEach(party => {
      party.country = country;
    });
  } else {
    parties = await PartyService.getParties();

    for (let i = 0; i < parties.length; i++) {
      let country = await CountryService.getCountry(parties[i].country);
      parties[i].country = country;
    }
  }

  if (!parties) {
    let payload = { error: 'Something Unexpected Happened' };
    return Promise.resolve({ status: 500, payload });
  }

  parties.sort((a, b) => b.members.length - a.members.length);

  return Promise.resolve({ status: 200, payload: { parties } });
}

StatsService.getNewspaperStats = async body => {
  let newspapers = null;

  if (body.country && body.country !== 'global') {
    newspapers = await NewsService.getCountryNewspapers(body.country);
    let country = await CountryService.getCountry(body.country);
    newspapers.forEach(newspaper => {
      newspaper.country = country;
    });
  } else {
    newspapers = await NewsService.getNewspapers();

    for (let i = 0; i < newspapers.length; i++) {
      let author = await MemberService.getUser(newspapers[i].author);
      if (author) {
        let country = await CountryService.getCountry(author.country);
        newspapers[i].country = country;
      }
    }
  }

  if (!newspapers) {
    let payload = { error: 'Something Unexpected Happened' };
    return Promise.resolve({ status: 500, payload });
  }

  newspapers.sort((a, b) => b.subscribers.length - a.subscribers.length);

  return Promise.resolve({ status: 200, payload: { newspapers } });
}

export default StatsService;
