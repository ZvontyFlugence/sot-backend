import cron from 'node-cron';
import ElectionService from '../services/electionService';

// Country Election Scheduler
cron.schedule('0 0 5 * *', async () => {
  await ElectionService.activateCountryElection();
}, { timezone: 'Etc/UTC' });

cron.schedule('0 0 6 * *', async () => {
  await ElectionService.closeCountryElection();
  await ElectionService.createCountryElection();
}, { timezone: 'Etc/UTC' });


// Congress Election Scheduler
cron.schedule('0 0 15 * *', async () => {
  await ElectionService.activateCongressElection();
}, { timezone: 'Etc/UTC' });

cron.schedule('0 0 16 * *', async () => {
  await ElectionService.closeCongressElection();
  await ElectionService.createCongressElection();
}, { timezone: 'Etc/UTC' });


// Party Election Scheduler
cron.schedule('0 0 25 * *', async () => {
  await ElectionService.activatePartyElection();
}, { timezone: 'Etc/UTC' });

cron.schedule('0 0 26 * *', async () => {
  await ElectionService.closePartyElection();
  await ElectionService.createPartyElection();
}, { timezone: 'Etc/UTC' });