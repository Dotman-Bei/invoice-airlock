import { Ledger } from './ledger.ts';
import { createBankServer } from './server.ts';

const token = process.env['BANK_TOKEN'];
if (!token) {
  console.error('BANK_TOKEN is required');
  process.exit(1);
}
createBankServer(token, new Ledger()).listen(9000, '0.0.0.0', () => {
  console.log('mock bank listening on 9000. No real money.');
});
