import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import env from 'dotenv';
env.config();

import authController from './controllers/authController';
import compController from './controllers/compController';
import countryController from './controllers/countryController';
import mapController from './controllers/mapController';
import newsController from './controllers/newsController';
import partyController from './controllers/partyController';
import regionController from './controllers/regionController';
import shoutsController from './controllers/shoutsController';
import statsController from './controllers/statsController';
import userController from './controllers/userController';
import db from './services/dbService';

const app = express();
const PORT = process.env.PORT || 5000;

db.connect(err => {
  if (err) {
    console.log('MongoDB Connection Failed!', err);
    process.exit(1);
  } else {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server listening on port :${PORT}`));
  }
});

app.use(express.static('./build'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authController);
app.use('/api/companies', compController);
app.use('/api/countries', countryController);
app.use('/api/map', mapController);
app.use('/api/news', newsController);
app.use('/api/parties', partyController);
app.use('/api/regions', regionController);
app.use('/api/shouts', shoutsController);
app.use('/api/stats', statsController);
app.use('/api/user', userController);

app.get('/', async (_, res) => {
  res.send('Use `/api/<endpoint>` to access API');
});