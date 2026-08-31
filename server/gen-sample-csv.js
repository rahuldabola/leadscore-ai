const fs = require('fs');
const path = require('path');
const { buildLeads } = require('./seed');
const { toCsv } = require('./csv');

const columns = ['first_name', 'last_name', 'title', 'company', 'industry', 'employee_count', 'location', 'email', 'phone', 'linkedin_url', 'source'];
const rows = buildLeads();
const csv = toCsv(rows, columns);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'sample_leads.csv'), csv);
console.log(`Wrote ${rows.length} sample rows to public/sample_leads.csv`);
