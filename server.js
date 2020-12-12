import express from 'express';
// import fs from 'fs';
// import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
// import React from 'react';
// import ReactDOMServer from 'react-dom/server';
// import App from '../src/App';
import authController from './controllers/authController';
import compController from './controllers/compController';
import countryController from './controllers/countryController';
import mapController from './controllers/mapController';
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
    app.listen(PORT, () => console.log(`Server connected to MongoDB and listening on port :${PORT}`));
  }
});

app.use(express.static('./build'));
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth', authController);
app.use('/api/companies', compController);
app.use('/api/countries', countryController);
app.use('/api/map', mapController);
app.use('/api/regions', regionController);
app.use('/api/shouts', shoutsController);
app.use('/api/stats', statsController);
app.use('/api/user', userController);

// app.get('/', (req, res) => {
//   const index = ReactDOMServer.renderToString(<App />);

//   fs.readFile(path.resolve('./build/index.html'), 'utf-8', (err, data) => {
//     if (err) {
//       console.log(err);
//       return res.status(500).json({ err: 'Failed to read index.html' });
//     }

//     return res.send(
//       data.replace('<div id="root"></div>', `<div id="root">${index}</div>`)
//     );
//   });
// });