const state = { leads: [], config: null };

const el = (id) => document.getElementById(id);

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

function scoreClass(score) {
  if (score >= 70) return 'score-hot';
  if (score >= 50) return 'score-warm';
  return 'score-cold';
}

function renderStats(stats) {
  const cards = [
    { label: 'Total leads', value: stats.total },
    { label: 'Avg. score', value: stats.avgScore, cls: 'accent' },
    { label: 'Hot leads (70+)', value: stats.hot, cls: 'accent' },
    { label: 'Duplicates removed', value: stats.duplicates },
    { label: 'Invalid emails flagged', value: stats.invalidEmails, cls: 'warn' },
  ];
  el('stats-row').innerHTML = cards.map((c) => `
    <div class="stat-card">
      <div class="label">${c.label}</div>
      <div class="value ${c.cls || ''}">${c.value ?? 0}</div>
    </div>
  `).join('');
}

function populateIndustryFilter(stats) {
  const sel = el('filter-industry');
  const current = sel.value;
  sel.innerHTML = '<option value="">All industries</option>' +
    stats.byIndustry.map((i) => `<option value="${i.industry}">${i.industry} (${i.count})</option>`).join('');
  sel.value = current;
}

function renderTable(leads) {
  const body = el('leads-body');
  el('empty-state').hidden = leads.length > 0;
  body.innerHTML = leads.map((l) => `
    <tr data-id="${l.id}">
      <td><span class="score-badge ${scoreClass(l.icp_score)}">${l.icp_score}</span></td>
      <td class="name-cell">
        <div class="full-name">${l.first_name} ${l.last_name}</div>
        <div class="seniority">${l.seniority}</div>
      </td>
      <td>${l.title || '—'}</td>
      <td>${l.company || '—'}</td>
      <td>${l.industry || '—'}</td>
      <td>${l.employee_count || '—'}</td>
      <td class="contact-cell">
        <div class="${l.valid_email ? 'flag-valid' : 'flag-invalid'}">${l.email || 'no email'}</div>
        <div>${l.phone || ''}</div>
      </td>
      <td>
        <select class="status-pill" data-id="${l.id}" onclick="event.stopPropagation()">
          ${['New', 'Contacted', 'Qualified', 'Disqualified'].map((s) => `<option ${s === l.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><button class="btn btn-sm btn-ghost" data-view="${l.id}" onclick="event.stopPropagation()">View</button></td>
    </tr>
  `).join('');

  body.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => openLeadDetail(Number(tr.dataset.id)));
  });
  body.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => openLeadDetail(Number(btn.dataset.view)));
  });
  body.querySelectorAll('.status-pill').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      await api(`/api/leads/${sel.dataset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: sel.value }),
      });
      loadStats();
    });
  });
}

async function loadLeads() {
  const params = new URLSearchParams();
  if (el('search').value) params.set('search', el('search').value);
  if (el('filter-industry').value) params.set('industry', el('filter-industry').value);
  if (el('filter-status').value) params.set('status', el('filter-status').value);
  if (el('filter-score').value !== '0') params.set('minScore', el('filter-score').value);
  params.set('sort', el('sort-by').value);

  const leads = await api(`/api/leads?${params.toString()}`);
  state.leads = leads;
  renderTable(leads);
}

async function loadStats() {
  const stats = await api('/api/stats');
  renderStats(stats);
  populateIndustryFilter(stats);
}

async function openLeadDetail(id) {
  const lead = state.leads.find((l) => l.id === id);
  if (!lead) return;
  const b = lead.score_breakdown;
  el('lead-detail').innerHTML = `
    <div class="lead-header">
      <div>
        <h2>${lead.first_name} ${lead.last_name}</h2>
        <p>${lead.title || '—'} at ${lead.company || '—'} · ${lead.location || 'unknown location'}</p>
      </div>
      <span class="score-badge ${scoreClass(lead.icp_score)}" style="font-size:16px;padding:8px 12px;">${lead.icp_score}</span>
    </div>
    ${['industry', 'companySize', 'seniority', 'dataCompleteness'].map((k) => {
      const item = b[k];
      if (!item) return '';
      const labelMap = { industry: 'Industry match', companySize: 'Company size fit', seniority: 'Seniority', dataCompleteness: 'Data completeness' };
      return `
        <div class="breakdown-row">
          <div style="flex:1">
            ${labelMap[k]} <span style="color:var(--text-muted)">(weight ${Math.round(item.weight * 100)}%)</span>
            <div class="bar-track"><div class="bar-fill" style="width:${item.value}%"></div></div>
          </div>
          <div style="width:40px;text-align:right;font-weight:600">${item.value}</div>
        </div>`;
    }).join('')}
    <p class="muted" style="margin-top:12px">Email: ${lead.email || 'missing'} ${lead.valid_email ? '✓ valid format' : '⚠ invalid/missing'} &nbsp;·&nbsp; Phone: ${lead.phone || 'missing'}</p>
    <button id="btn-gen-draft" class="btn btn-primary btn-sm">Generate outreach draft</button>
    <div id="draft-box" class="draft-box" ${lead.outreach_draft ? '' : 'hidden'}>${lead.outreach_draft || ''}</div>
  `;
  el('btn-gen-draft').addEventListener('click', async () => {
    const { draft } = await api(`/api/leads/${lead.id}/draft`, { method: 'POST' });
    const box = el('draft-box');
    box.hidden = false;
    box.textContent = draft;
  });
  el('lead-dialog').showModal();
}

async function openConfig() {
  const cfg = await api('/api/icp-config');
  el('cfg-industries').value = cfg.target_industries.join(', ');
  el('cfg-min-emp').value = cfg.min_employees;
  el('cfg-max-emp').value = cfg.max_employees;
  el('w-industry').value = cfg.weights.industry;
  el('w-size').value = cfg.weights.companySize;
  el('w-seniority').value = cfg.weights.seniority;
  el('w-completeness').value = cfg.weights.dataCompleteness;
  state.config = cfg;
  el('config-dialog').showModal();
}

async function saveConfig() {
  const payload = {
    target_industries: el('cfg-industries').value.split(',').map((s) => s.trim()).filter(Boolean),
    min_employees: Number(el('cfg-min-emp').value),
    max_employees: Number(el('cfg-max-emp').value),
    seniority_weights: state.config.seniority_weights,
    weights: {
      industry: Number(el('w-industry').value),
      companySize: Number(el('w-size').value),
      seniority: Number(el('w-seniority').value),
      dataCompleteness: Number(el('w-completeness').value),
    },
  };
  await api('/api/icp-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  el('config-dialog').close();
  await refresh();
}

async function refresh() {
  await loadStats();
  await loadLeads();
}

el('btn-import').addEventListener('click', () => { el('import-result').textContent = ''; el('import-dialog').showModal(); });
el('btn-cancel-import').addEventListener('click', () => el('import-dialog').close());
el('btn-config').addEventListener('click', openConfig);
el('btn-cancel-config').addEventListener('click', () => el('config-dialog').close());
el('btn-save-config').addEventListener('click', saveConfig);
el('btn-close-lead').addEventListener('click', () => el('lead-dialog').close());

el('btn-load-sample').addEventListener('click', async () => {
  const res = await fetch('/sample_leads.csv');
  el('import-textarea').value = await res.text();
});

el('btn-run-import').addEventListener('click', async () => {
  const text = el('import-textarea').value.trim();
  if (!text) return;
  try {
    const result = await api('/api/leads/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text });
    el('import-result').textContent = `Imported ${result.imported} new leads · ${result.duplicatesRemoved} duplicates auto-removed · ${result.invalidFlagged} flagged with missing/invalid contact info.`;
    await refresh();
  } catch (err) {
    el('import-result').textContent = `Error: ${err.message}`;
  }
});

el('btn-export').addEventListener('click', () => {
  const params = new URLSearchParams();
  if (el('filter-industry').value) params.set('industry', el('filter-industry').value);
  if (el('filter-status').value) params.set('status', el('filter-status').value);
  if (el('filter-score').value !== '0') params.set('minScore', el('filter-score').value);
  window.location.href = `/api/leads/export?${params.toString()}`;
});

['search', 'filter-industry', 'filter-status', 'filter-score', 'sort-by'].forEach((id) => {
  el(id).addEventListener('input', () => loadLeads());
  el(id).addEventListener('change', () => loadLeads());
});

refresh();
