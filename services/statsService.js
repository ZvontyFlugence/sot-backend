import MemberService from './memberService';
import CountryService from './countryService';

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

export default StatsService;
