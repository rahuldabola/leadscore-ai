const INDUSTRY_HOOKS = {
  'SaaS': 'scaling recurring revenue while keeping churn low',
  'E-commerce': 'converting more traffic into repeat customers',
  'Fintech': 'balancing compliance with a fast product velocity',
  'Healthcare Tech': 'improving patient outcomes without adding operational overhead',
  'Professional Services': 'winning more billable work without growing overhead headcount',
};

function generateDraft(lead) {
  const first = lead.first_name || 'there';
  const company = lead.company || 'your team';
  const hook = INDUSTRY_HOOKS[lead.industry] || 'hitting your growth targets this quarter';
  const roleLine = lead.title ? `you're the ${lead.title} at ${company}` : `you're at ${company}`;

  return [
    `Subject: Quick idea for ${company}`,
    '',
    `Hi ${first},`,
    '',
    `Noticed ${roleLine} — companies in ${lead.industry || 'your space'} around your size are usually focused on ${hook}. Wanted to reach out because we've helped similar teams make progress there without adding a lot of process overhead.`,
    '',
    `Worth a quick 15-minute call this week to see if it's relevant to what you're working on?`,
    '',
    `Best,`,
    `[Your Name]`,
  ].join('\n');
}

module.exports = { generateDraft, INDUSTRY_HOOKS };
