const { importLeads } = require('./pipeline');

const industries = ['SaaS', 'E-commerce', 'Fintech', 'Healthcare Tech', 'Professional Services', 'Manufacturing', 'Real Estate'];
const titles = [
  'CEO', 'Founder', 'CTO', 'VP of Sales', 'VP of Marketing', 'Director of Operations',
  'Director of Growth', 'Sales Manager', 'Marketing Manager', 'Software Engineer',
  'Head of Revenue', 'COO', 'Account Executive', 'Product Manager',
];
const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Drew', 'Sam', 'Avery', 'Quinn', 'Reese', 'Sydney', 'Cameron', 'Peyton'];
const lastNames = ['Reed', 'Bennett', 'Coleman', 'Foster', 'Hayes', 'Nolan', 'Pierce', 'Sawyer', 'Vaughn', 'Winters', 'Ortiz', 'Kane', 'Lowe', 'Marsh', 'Voss'];
const companyWords = ['Bright', 'North', 'Summit', 'Clear', 'Bridge', 'Vertex', 'Sterling', 'Horizon', 'Cobalt', 'Lumen', 'Anchor', 'Pinnacle'];
const companySuffix = ['Labs', 'Works', 'Group', 'Systems', 'Partners', 'Digital', 'Solutions', 'Health', 'Commerce'];
const locations = ['Austin, TX', 'New York, NY', 'San Francisco, CA', 'Chicago, IL', 'Denver, CO', 'Miami, FL', 'Boston, MA'];

function pick(arr, i) { return arr[i % arr.length]; }
function rand(seed) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

function buildLeads() {
  const rows = [];
  for (let i = 0; i < 55; i++) {
    const first = pick(firstNames, i * 3 + 1);
    const last = pick(lastNames, i * 5 + 2);
    const company = `${pick(companyWords, i * 2)}${pick(companySuffix, i * 7)}`;
    const industry = pick(industries, i);
    const title = pick(titles, i * 4 + 1);
    const employee = Math.floor(rand(i + 1) * 900) + 5;
    const domain = `${company.toLowerCase()}.com`;
    const hasEmail = rand(i * 9 + 3) > 0.08;
    const emailValid = rand(i * 13 + 1) > 0.12;
    const email = hasEmail
      ? (emailValid ? `${first.toLowerCase()}.${last.toLowerCase()}@${domain}` : `${first.toLowerCase()}_at_${domain}`)
      : '';
    const hasPhone = rand(i * 6 + 2) > 0.35;
    const phone = hasPhone ? `+1-${200 + (i % 700)}-555-01${(10 + i % 89)}` : '';

    rows.push({
      first_name: first,
      last_name: last,
      title,
      company,
      industry,
      employee_count: String(employee),
      location: pick(locations, i * 2 + 1),
      email,
      phone,
      linkedin_url: rand(i * 4) > 0.3 ? `https://linkedin.com/in/${first.toLowerCase()}${last.toLowerCase()}` : '',
      source: 'sample_dataset',
    });

    // Inject a handful of intentional duplicates (same email, re-scraped from another page)
    if (i % 11 === 0 && hasEmail && emailValid) {
      rows.push({
        first_name: first,
        last_name: last,
        title,
        company,
        industry,
        employee_count: '',
        location: '',
        email,
        phone: '',
        linkedin_url: '',
        source: 'sample_dataset_rescrape',
      });
    }
  }
  return rows;
}

if (require.main === module) {
  const result = importLeads(buildLeads());
  console.log('Seed complete:', result);
}

module.exports = { buildLeads };
