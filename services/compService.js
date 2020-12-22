import db from './dbService';

const CompService = {};

const CompActions = {
  CREATE_JOB_OFFER: 'CREATE_JOB_OFFER',
  EDIT_EMPLOYEE: 'EDIT_EMPLOYEE',
  FIRE_EMPLOYEE: 'FIRE_EMPLOYEE',
  SELL_PRODUCT: 'SELL_PRODUCT',
  UNLIST_JOB: 'UNLIST_JOB',
  UNLIST_PRODUCT: 'UNLIST_PRODUCT',
};

CompService.createCompany = async data => {
  let companies = db.getDB().collection('companies');

  let comp_doc = {
    _id: await companies.estimatedDocumentCount() + 1,
    name: data.name,
    image: process.env.DEFAULT_IMAGE,
    type: data.type,
    ceo: data.ceo,
    location: data.location,
    funds: [],
    inventory: [],
    employees: [],
    productOffers: [],
    jobOffers: [],
  };

  let res = await companies.insert(comp_doc);
  let company = res.ops[0];

  if (company)
    return Promise.resolve({ status: 201, payload: { success: true, comp_id: company._id } });
  return Promise.resolve({ status: 500, payload: { success: false, err: 'Something Unexpected Happened' } });
};

CompService.deleteCompany = async (user_id, comp_id) => {
  let companies = db.getDB().collection('companies');
  let payload = {};

  if (companies.ceo !== user_id) {
    payload = { success: false, error: 'You are not the company CEO' };
    return Promise.resolve({ status: 400, payload });
  }

  let deleted = await companies.findOneAndDelete({ _id: comp_id });

  if (deleted) {
    let users = db.getDB().collection('users');
    let updated_ceo = await users.findOneAndUpdate({ _id: user_id }, { $inc: { gold: 12 } });

    if (updated_ceo) {
      payload = { success: true };
      return Promise.resolve({ status: 200, payload });
    }

    payload = { success: false, error: 'Failed to Update User' };
    return Promise.resolve({ status: 500, payload });
  }

  payload = { success: false, error: 'Failed to Delete Company' };
  return Promise.resolve({ status: 500, payload });
};

CompService.updateCompanyDetails = async (user_id, comp_id, data) => {
  let companies = db.getDB().collection('companies');
  let payload, updates = {};

  if (!data.hasOwnProperty('name') && !data.hasOwnProperty('image')) {
    payload = { success: false, error: 'No valid updates provided' };
    return Promise.resolve({ status: 400, payload });
  }

  if (data.hasOwnProperty('name')) {
    updates.name = data.name;
  }

  if (data.hasOwnProperty('image')) {
    updates.image = data.image;
  }

  let updated_comp = companies.findOneAndUpdate({ _id: comp_id }, { $set: updates });

  if (updated_comp) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  payload = { success: false, error: 'Failed to Update Company' };
  return Promise.resolve({ status: 500, payload});
};

CompService.getCompany = async id => {
  const companies = db.getDB().collection('companies');
  return await companies.findOne({ _id: id });
};

CompService.getUserCompanies = async ceo_id => {
  const companies = db.getDB().collection('companies');
  return await companies.find({ ceo: ceo_id }).toArray();
};

CompService.doAction = async (id, body) => {
  switch (body.action.toUpperCase()) {
    case CompActions.CREATE_JOB_OFFER:
      return await create_job(id, body.jobOffer);
    case CompActions.EDIT_EMPLOYEE:
      return await edit_employee(id, body.employeeData);
    case CompActions.FIRE_EMPLOYEE:
      return await fire_employee(id, employeeId);
    case CompActions.SELL_PRODUCT:
      return await sell_product(id, body.productOffer);
    case CompActions.UNLIST_JOB:
      return await unlist_job(id, body.offer);
    case CompActions.UNLIST_PRODUCT:
      return await unlist_product(id, body.offer);    
    default:
      const payload = { success: false, error: 'Unsupported Action!' };
      return Promise.resolve({ status: 400, payload });
  }
};

const sell_product = async (id, productOffer) => {
  const companies = db.getDB().collection('companies');
  let company = await companies.findOne({ _id: id });
  let payload = { success: false, error: 'Something Went Wrong!'};

  if (!company) {
    payload = { success: false, error: 'Company Not Found!' };
    return Promise.resolve({ status: 404, payload });
  }

  // Validate that the company has the requested item and quantity in their inventory
  let item = company.inventory.find(item => item.id === productOffer.id);
  if (!item) {
    payload = { success: false, error: 'Company does not have that item in its inventory' };
    return Promise.resolve({ status: 400, payload });
  } else if (item.quantity < productOffer.quantity) {
    payload = { success: false, error: 'Cannot sell more items than owned' };
    return Promise.resolve({ status: 400, payload });
  }
  
  item.quantity -= productOffer.quantity;

  let updates = { productOffers: [...company.productOffers, productOffer], inventory: company.inventory };
  let updated = companies.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 201, payload });
  }

  return Promise.resolve({ status: 500, payload });
};

const unlist_product = async (id, offer) => {
  const companies = db.getDB().collection('companies');
  let company = await companies.findOne({ _id: id });
  let payload = {};
  let updates = {};

  let comp_offer = company.productOffers.find(o => o.id === offer.id);
  let inv_item = company.inventory.find(i => i.id === offer.id);

  if (!comp_offer) {
    payload = { success: false, error: 'Product Offer Not Found!' };
    return Promise.resolve({ status: 404, payload });
  }

  if (inv_item) {
    company.inventory.splice(company.inventory.indexOf(inv_item), 1);
    inv_item.quantity += offer.quantity;
    updates.inventory = [...company.inventory, inv_item];
  }

  let offer_index = company.productOffers.indexOf(comp_offer);
  company.productOffers.splice(offer_index, 1);
  updates.productOffers = [...company.productOffers];

  let updated = await companies.findOneAndUpdate({ _id: id }, { $set: updates });
  
  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  payload = { success: false, error: 'Something Went Wrong!' };
  return Promise.resolve({ status: 500, payload });
};

const create_job = async (id, jobOffer) => {
  const companies = db.getDB().collection('companies');
  let company = await companies.findOne({ _id: id });
  let payload = { success: false, error: 'Something went wrong!' };

  if (!company) {
    payload = { success: false, error: 'Company Not Found' };
    return Promise.resolve({ status: 404, payload });
  }

  // Validate that the company has enough money to pay for job
  if ((jobOffer.wage * jobOffer.quantity) > company.funds.amount) {
    payload = { success: false, error: 'Insufficient Funds' };
    return Promise.resolve({ status: 400, payload });
  }

  jobOffer.id = company.jobOffers.length;

  let updates = { jobOffers: [...company.jobOffers, jobOffer] };
  let updated = companies.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 201, payload });
  }

  return Promise.resolve({ status: 500, payload });
}

const unlist_job = async (id, offer) => {
  let companies = db.getDB().collection('companies');
  let company = await companies.findOne({ _id: id });
  let payload = { success: false, error: 'Something Went Wrong!' };
  let updates = {};
  
  let jobOfferIndex = company.jobOffers.findIndex(o => o.id == offer.id);

  if (!jobOfferIndex) {
    payload = { success: false, error: 'Job Offer Not Found!' };
    return Promise.resolve({ status: 404, payload });
  }

  company.jobOffers.splice(jobOfferIndex, 1);
  updates.jobOffers = [...company.jobOffers];

  let updated = company.findOneAndUpdate({ _id: id }, { $set: updates });

  if (updated) {
    payload = { success: true };
    return Promise.resolve({ status: 200, payload });
  }

  return Promise.resolve({ status: 500, payload });
}

const edit_employee = async (id, employeeData) => {
  const companies = db.getDB().collection('companies');
  const users = db.getDB().collection('users');
  let company = await companies.findOne({ _id: id });
  let payload = {};
  let updates = {};

  if (!company) {
    payload.error = 'Company Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let user = await users.findOne({ _id: employeeData.userId });

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let employee = company.employees.find(emp => emp.userId === employeeData.userId);

  if (!employee) {
    payload.error = 'User is not an Employee!';
    return Promise.resolve({ status: 400, payload });
  }

  if (employeeData.hasOwnProperty('title')) {
    employee.title = employeeData.title;
    user.alerts.push({
      read: false,
      type: 'JOB_TITLE_CHANGED',
      message: `Your employer changed your title to: ${employeeData.title}`,
      timestamp: new Date(Date.now()),
    });
  }
  
  if (employeeData.hasOwnProperty('wage')) {
    employee.wage = employeeData.wage;
    user.alerts.push({
      read: false,
      type: 'JOB_WAGE_CHANGED',
      message: `Your employer changed your wage to: ${employeeData.wage.toFixed(2)} ${company.funds.currency}`,
      timestamp: new Date(Date.now()),
    });
  }

  updates = { employees: [...company.employees] };
  let updated = await companies.findOneAndUpdate({ _id: id }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to update Employee';
    return Promise.resolve({ status: 500, payload });
  }

  // Update user to notify job details change
  updates = { alerts: [...user.alerts] };
  updated = await users.findOneAndUpdate({ _id: user._id }, { $set: updates });
  
  if (!updated) {
    payload.error = 'Failed to notify Employee!';
    return Promise.resolve({ status: 500, payload });
  }

  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

const fire_employee = async (id, employeeId) => {
  const companies = db.getDB().collection('companies');
  const users = db.getDB().collection('users');
  let company = await companies.findOne({ _id: id });
  let payload = {};
  let updates = {};

  if (!company) {
    payload.error = 'Company Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let user = await users.findOne({ _id: employeeId });

  if (!user) {
    payload.error = 'User Not Found!';
    return Promise.resolve({ status: 404, payload });
  }

  let index = company.employees.findIndex(emp => emp.userId === employeeId);

  if (index === -1) {
    payload.error = 'User is not an Employee!';
    return Promise.resolve({ status: 400, payload });
  }

  company.employees.splice(index, 1);
  updates = { employees: [...company.employees] };
  let updated = await company.findOneAndUpdate({ _id: id }, { $set: updates });
  
  if (!updated) {
    payload.error = 'Failed to Fire Employee';
    return Promise.resolve({ status: 500, payload });
  }

  // Alert User of Firing
  user.alerts.push({
    read: false,
    type: 'JOB_TERMINATED',
    message: `You have been fired from your job at ${company.name}`,
    timestamp: new Date(Date.now()),
  });
  updates = { alerts: [...user.alerts] };
  updated = await users.findOneAndUpdate({ _id: employeeId }, { $set: updates });

  if (!updated) {
    payload.error = 'Failed to notify Employee of Firing!';
    return Promise.resolve({ status: 500, payload });
  }

  payload.success = true;
  return Promise.resolve({ status: 200, payload });
}

export default CompService;