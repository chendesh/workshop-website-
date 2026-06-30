
import { generateMonthlyReport, generateWeeklyReport } from './reports.controller.js';

const mockRes = {
  status: (code) => {
    return {
      json: (data) => console.log('Response:', code, data)
    };
  }
};

const req = {
  body: {
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30'
  }
};

async function test() {
  console.log('Testing PDF Report Generation...');
  await generateMonthlyReport(req, mockRes);
  console.log('Testing Excel Report Generation...');
  await generateWeeklyReport(req, mockRes);
  process.exit(0);
}

test().catch(console.error);

