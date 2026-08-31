const SENIORITY_KEYWORDS = [
  { level: 'C-Level', patterns: [/\bce?o\b/i, /\bcto\b/i, /\bcfo\b/i, /\bcmo\b/i, /\bcoo\b/i, /chief/i, /founder/i, /owner/i, /president/i] },
  { level: 'VP', patterns: [/\bvp\b/i, /vice president/i, /head of/i] },
  { level: 'Director', patterns: [/director/i] },
  { level: 'Manager', patterns: [/manager/i, /lead\b/i] },
];

function inferSeniority(title) {
  if (!title) return 'Individual Contributor';
  for (const { level, patterns } of SENIORITY_KEYWORDS) {
    if (patterns.some((p) => p.test(title))) return level;
  }
  return 'Individual Contributor';
}

function inferDomain(email, company) {
  if (email && email.includes('@')) {
    return email.split('@')[1].toLowerCase().trim();
  }
  if (company) {
    return company
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .join('') + '.com';
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s().-]{7,}$/;

function isValidEmail(email) {
  return !!email && EMAIL_RE.test(email.trim());
}

function isValidPhone(phone) {
  return !!phone && PHONE_RE.test(phone.trim());
}

function scoreLead(lead, config) {
  const targetIndustries = JSON.parse(config.target_industries);
  const seniorityWeights = JSON.parse(config.seniority_weights);
  const weights = JSON.parse(config.weights);

  const industryMatch = lead.industry && targetIndustries.some(
    (t) => t.toLowerCase() === lead.industry.toLowerCase()
  );
  const industryScore = industryMatch ? 100 : (lead.industry ? 25 : 0);

  let companySizeScore = 0;
  const emp = Number(lead.employee_count) || 0;
  if (emp >= config.min_employees && emp <= config.max_employees) {
    companySizeScore = 100;
  } else if (emp > 0) {
    const mid = (config.min_employees + config.max_employees) / 2;
    const distance = Math.abs(emp - mid) / mid;
    companySizeScore = Math.max(0, Math.round(100 - distance * 60));
  }

  const seniorityScore = seniorityWeights[lead.seniority] ?? 20;

  const fields = [lead.email, lead.phone, lead.linkedin_url, lead.title, lead.industry, lead.employee_count];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== '').length;
  const completenessScore = Math.round((filled / fields.length) * 100);

  const total = Math.round(
    industryScore * weights.industry +
    companySizeScore * weights.companySize +
    seniorityScore * weights.seniority +
    completenessScore * weights.dataCompleteness
  );

  return {
    score: Math.min(100, Math.max(0, total)),
    breakdown: {
      industry: { value: industryScore, weight: weights.industry, matched: industryMatch },
      companySize: { value: companySizeScore, weight: weights.companySize },
      seniority: { value: seniorityScore, weight: weights.seniority, level: lead.seniority },
      dataCompleteness: { value: completenessScore, weight: weights.dataCompleteness },
    },
  };
}

function dedupeKey(lead) {
  if (lead.email) return `email:${lead.email.trim().toLowerCase()}`;
  const domain = lead.company_domain || '';
  const last = (lead.last_name || '').trim().toLowerCase();
  return `namecompany:${last}:${domain.toLowerCase()}`;
}

function fieldCount(lead) {
  return Object.values(lead).filter((v) => v !== null && v !== undefined && v !== '').length;
}

module.exports = { inferSeniority, inferDomain, isValidEmail, isValidPhone, scoreLead, dedupeKey, fieldCount };
