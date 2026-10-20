
'use strict';

// BESA SECURITY - Aplikim per Pune v1.4
// Raporti i optimizuar per A4.

const cfg = window.BESA_CONFIG;

const supa = cfg?.url && cfg?.anonKey && window.supabase
  ? window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

const gate = document.querySelector('#loginGate');
const appView = document.querySelector('#appView');
const hrView = document.querySelector('#hrView');
const status = document.querySelector('#authStatus');

let currentRole = null;

const fileFields = [
  'leternjoftimi_para_file',
  'leternjoftimi_prapa_file',
  'kartela_bankare_file',
  'certifikata_trajnimi_file',
  'certifikata_shkollore_file'
];

const requiredFiles = fileFields.slice(0, 3);

const documentLabels = {
  leternjoftimi_para_file: 'Leternjoftimi - para',
  leternjoftimi_prapa_file: 'Leternjoftimi - prapa',
  leternjoftimi_file: 'Leternjoftimi (i vjeter)',
  kartela_bankare_file: 'Dokumenti bankar',
  certifikata_trajnimi_file: 'Certifikata e trajnimeve',
  certifikata_shkollore_file: 'Certifikata shkollore'
};

const allDocumentFields = [
  ...fileFields,
  'leternjoftimi_file'
];

const labels = {
  pozita: 'Pozita e aplikuar',
  emri: 'Emri',
  mbiemri: 'Mbiemri',
  emri_babait: 'Emri i babait',
  gjinia: 'Gjinia',
  data_lindjes: 'Data e lindjes',
  vendi_lindjes: 'Vendi i lindjes',
  numri_leternjoftimit: 'Nr. i leternjoftimit',
  xhirollogaria: 'Xhirollogaria bankare',
  emri_bankes: 'Emri i bankes',
  adresa: 'Adresa',
  vendbanimi: 'Vendbanimi',
  telefoni: 'Nr. i telefonit',
  drejtimi: 'Drejtimi i shkollimit',
  trajnime: 'Trajnimet profesionale',
  pershkrim_trajnimeve: 'Pershkrimi i trajnimeve',
  kategorite: 'Kategorite e patentes',
  denuar: 'I denuar',
  gjatesia: 'Gjatesia (cm)',
  pesha: 'Pesha (kg)',
  perkatesia_etnike: 'Perkatesia etnike',
  pergatitja_shkollore: 'Pergatitja shkollore',
  kontakti_familjar: 'Kontakti familjar',
  lidhja_familjare: 'Lidhja familjare',
  telefoni_familjar: 'Telefoni familjar',
  patente: 'Patenta e shoferit',
  statusi_ligjor: 'Statusi ligjor',
  arsyeja_statusit: 'Arsyeja / sqarimi',
  perkatesia_tjeter: 'Perkatesia - Tjeter'
};

const bankNames = {
  RBKO: 'Raiffeisen Bank Kosovo',
  TEB: 'TEB',
  NLB: 'NLB Banka',
  PCB: 'ProCredit Bank',
  BKT: 'Banka Kombetare Tregtare - BKT',
  BPB: 'Banka per Biznes - BPB',
  BE: 'Banka Ekonomike',
  ZIRAAT: 'Ziraat Bank Kosova',
  CREDINS: 'Banka Credins Kosove',
  PRIBANK: 'PriBank'
};

const ordered = [
  'emri',
  'mbiemri',
  'emri_babait',
  'gjinia',
  'data_lindjes',
  'vendi_lindjes',
  'numri_leternjoftimit',
  'xhirollogaria',
  'emri_bankes',
  'adresa',
  'vendbanimi',
  'telefoni',
  'drejtimi',
  'trajnime',
  'pershkrim_trajnimeve',
  'kategorite',
  'denuar',
  'gjatesia',
  'pesha',
  'perkatesia_etnike',
  'pergatitja_shkollore',
  'kontakti_familjar',
  'lidhja_familjare',
  'telefoni_familjar'
];

const formatNumber = n =>
  n == null ? 'Pa numer' : String(n).padStart(4, '0');

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

function displayValue(key, data) {
  let value = data[key];

  if (key === 'emri_bankes') {
    if (value === 'Tjeter' || value === 'Tjetër') {
      value = data.emri_bankes_tjeter || 'Tjeter';
    } else if (bankNames[value]) {
      value = bankNames[value] + ' (' + value + ')';
    }
  }

  if (key === 'perkatesia_etnike' && value === 'Tjeter') {
    value = data.perkatesia_tjeter || value;
  }

  if (Array.isArray(value)) {
    return value.join(', ') || '—';
  }

  return String(value ?? '').trim() || '—';
}

// ============================================
// LOGIN DHE SESIONI
// ============================================

async function refresh() {
  gate.hidden = false;
  appView.hidden = true;
  hrView.hidden = true;
  currentRole = null;

  if (!supa) {
    status.textContent = 'Kontrollo config.js.';
    return;
  }

  const {
    data: { user },
    error
  } = await supa.auth.getUser();

  if (error || !user) {
    status.textContent = '';
    return;
  }

  const roleResult = await supa
    .from('account_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (
    roleResult.error ||
    !['aplikant', 'hr'].includes(roleResult.data?.role)
  ) {
    await supa.auth.signOut();
    status.textContent = 'Nuk keni rol te autorizuar.';
    return;
  }

  currentRole = roleResult.data.role;
  gate.hidden = true;

  if (currentRole === 'hr') {
    hrView.hidden = false;
    await loadHR();
  } else {
    appView.hidden = false;
    const form = document.querySelector('#application');
    form.reset();
    form.dispatchEvent(new Event('change'));
  }
}

document.querySelector('#loginForm')
  .addEventListener('submit', async event => {
    event.preventDefault();

    if (!supa) {
      status.textContent = 'Supabase nuk eshte konfiguruar.';
      return;
    }

    const username = document.querySelector('#username')
      .value.trim().toLowerCase();

    if (![
      'aplikant1',
      'aplikant2',
      'aplikant3',
      'admin'
    ].includes(username)) {
      status.textContent = 'Username i pavlefshem.';
      return;
    }

    const { error } = await supa.auth.signInWithPassword({
      email: username + '@besa.login',
      password: document.querySelector('#password').value
    });

    if (error) {
      status.textContent = 'Kyçja deshtoi.';
      return;
    }

    await refresh();
  });

document.querySelectorAll('.logout').forEach(button => {
  button.addEventListener('click', async () => {
    if (supa) await supa.auth.signOut();
    await refresh();
  });
});

// ============================================
// DERGIMI I APLIKIMIT
// ============================================

async function submitApplication(form) {
  if (currentRole !== 'aplikant' || !supa) {
    throw new Error('Nuk jeni i autorizuar.');
  }

  const fd = new FormData(form);
  const data = {};

  for (const [key, value] of fd.entries()) {
    if (!(value instanceof File)) {
      data[key] = value;
    }
  }

  data.kategorite = fd.getAll('kategorite');
  data.data_aplikimit = new Date().toISOString();

  const id = crypto.randomUUID();
  const uploaded = [];

  try {
    for (const name of fileFields) {
      const file = fd.get(name);

      if (!file?.size) {
        if (requiredFiles.includes(name)) {
          throw new Error(
            'Dokumenti mungon: ' + documentLabels[name]
          );
        }
        continue;
      }

      const ext = file.name.split('.').pop().toLowerCase();

      const allowed = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png'
      };

      if (
        !allowed[ext] ||
        allowed[ext] !== file.type ||
        file.size > 5242880
      ) {
        throw new Error(
          'Dokument i pavlefshem: ' + documentLabels[name]
        );
      }

      const path = id + '/' + name + '.' + ext;

      const { error } = await supa.storage
        .from('application-documents')
        .upload(path, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        throw new Error('Ngarkimi deshtoi: ' + error.message);
      }

      uploaded.push(path);
      data[name] = path;
    }

    const {
      data: inserted,
      error
    } = await supa
      .from('applications')
      .insert({ id, data })
      .select('application_number')
      .single();

    if (error) {
      throw new Error('Ruajtja deshtoi: ' + error.message);
    }

    form.reset();
    form.dispatchEvent(new Event('change'));

    return {
      id,
      number: inserted?.application_number ?? null
    };

  } catch (error) {
    if (uploaded.length) {
      await supa.storage
        .from('application-documents')
        .remove(uploaded);
    }
    throw error;
  }
}

window.besaSubmit = submitApplication;

// ============================================
// HR DASHBOARD
// ============================================

async function loadHR() {
  const root = document.querySelector('#hrList');
  root.textContent = 'Duke ngarkuar...';

  if (!supa) return;

  const { data, error } = await supa
    .from('applications')
    .select('id,application_number,created_at,data,status')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    root.textContent = 'Gabim: ' + error.message;
    return;
  }

  root.replaceChildren();

  if (!data?.length) {
    root.textContent = 'Nuk ka aplikime.';
    return;
  }

  for (const record of data) {
    const d = record.data || {};
    const card = document.createElement('article');
    card.className = 'hr-card';

    const heading = document.createElement('h3');

    heading.textContent =
      'Nr. ' + formatNumber(record.application_number) +
      ' · ' +
      [d.emri, d.mbiemri].filter(Boolean).join(' ') +
      ' — ' + (d.pozita || '');

    card.append(heading);

    const meta = document.createElement('p');

    meta.textContent =
      new Date(record.created_at).toLocaleString('sq-AL') +
      ' · ' + (record.status || 'I ri');

    card.append(meta);

    const print = document.createElement('button');
    print.type = 'button';
    print.textContent = 'Shiko / Printo A4';
    print.onclick = () => printApplication(record);
    card.append(print);

    const select = document.createElement('select');

    for (const value of [
      'I ri',
      'Ne shqyrtim',
      'Interviste',
      'Pranuar',
      'Refuzuar'
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    }

    select.value = record.status || 'I ri';

    select.onchange = async () => {
      const previous = record.status || 'I ri';

      const { error } = await supa
        .from('applications')
        .update({ status: select.value })
        .eq('id', record.id);

      if (error) {
        alert(error.message);
        select.value = previous;
      } else {
        record.status = select.value;
      }
    };

    card.append(select);

    for (const key of allDocumentFields) {
      if (!d[key]) continue;

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Hap ' + documentLabels[key];

      button.onclick = async () => {
        const { data: link, error } = await supa.storage
          .from('application-documents')
          .createSignedUrl(d[key], 60);

        if (error) {
          alert(error.message);
        } else {
          window.open(
            link.signedUrl,
            '_blank',
            'noopener,noreferrer'
          );
        }
      };

      card.append(button);
    }

    root.append(card);
  }
}

document.querySelector('#refreshHR')
  .addEventListener('click', loadHR);

// ============================================
// RAPORTI A4 - VERSIONI I RI
// ============================================

function printApplication(record) {
  const d = record.data || {};
  const win = window.open('', '_blank');

  if (!win) {
    alert('Lejo pop-up per printim.');
    return;
  }

  const number = formatNumber(record.application_number);
  const date = new Date(record.created_at)
    .toLocaleString('sq-AL');

  const logo = new URL(
    'besa-logo.png',
    window.location.href
  ).href;

  // 24 fushat, ne nje kolone.
  const rows = ordered.map((key, index) => `
    <div class="field">
      <div class="field-label">
        ${index + 1}. ${esc(labels[key])}
      </div>
      <div class="field-value">
        ${esc(displayValue(key, d))}
      </div>
    </div>
  `).join('');

  // Te dhenat shtese shfaqen vetem nese jane plotesuar.
  const excluded = new Set([
    ...ordered,
    ...allDocumentFields,
    'pozita',
    'data_aplikimit',
    'pajtimi',
    'emri_bankes_tjeter',
    'perkatesia_tjeter'
  ]);

  const extraKeys = Object.keys(d).filter(key => {
    if (excluded.has(key)) return false;
    const value = d[key];
    return value != null && String(value).trim() !== '';
  });

  const extra = extraKeys.map(key => `
    <div class="field">
      <div class="field-label">
        ${esc(labels[key] || key.replaceAll('_', ' '))}
      </div>
      <div class="field-value">
        ${esc(displayValue(key, d))}
      </div>
    </div>
  `).join('');

  const docs = allDocumentFields
    .filter(key => d[key])
    .map(key => `
      <span class="doc-item">
        &#10003; ${esc(documentLabels[key])}
      </span>
    `).join('');

  const css = `
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
    }

    body {
      background: #e8edf2;
      color: #172b40;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9px;
      line-height: 1.25;
    }

    .toolbar {
      text-align: center;
      background: #173651;
      padding: 12px;
    }

    .toolbar button {
      padding: 10px 18px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin: 0 5px;
      font-size: 12px;
    }

    /* A4 me permasa reale */
    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 12px auto;
      padding: 8mm;
      background: white;
      box-shadow: 0 3px 16px rgba(0,0,0,.12);
    }

    .heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 7px;
      border-bottom: 2px solid #ad2733;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .logo {
      width: 78px;
      max-height: 65px;
      object-fit: contain;
    }

    .company {
      font-weight: 800;
      font-size: 12px;
      letter-spacing: .3px;
    }

    h1 {
      margin: 4px 0 2px;
      font-size: 13px;
      line-height: 1.15;
    }

    .subtitle {
      color: #526579;
      font-size: 9px;
    }

    .iso {
      text-align: right;
      white-space: nowrap;
      align-self: flex-start;
      font-weight: bold;
      font-size: 8px;
    }

    .iso small {
      display: block;
      font-weight: normal;
      margin-top: 3px;
    }

    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 10px;
      background: #f1f4f7;
      padding: 7px 9px;
      margin: 8px 0;
      border-radius: 3px;
    }

    .application-number {
      font-weight: 800;
      font-size: 11px;
    }

    .section-title {
      margin: 8px 0 3px;
      padding: 5px 7px;
      font-size: 10px;
      background: #edf2f6;
      border-left: 3px solid #ad2733;
      break-after: avoid;
    }

    /* Nje fushe per rresht */
    .field {
      display: grid;
      grid-template-columns: 40% minmax(0, 60%);
      align-items: start;
      gap: 5px;
      min-height: 20px;
      padding: 3px 5px;
      border-bottom: 1px solid #e1e6eb;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .field:nth-of-type(even) {
      background: #fafbfc;
    }

    .field-label {
      font-weight: bold;
      color: #405367;
    }

    .field-value {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      min-width: 0;
    }

    .documents {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      padding: 5px;
      font-size: 8px;
    }

    .doc-item {
      white-space: normal;
    }

    .footer {
      margin-top: 9px;
      padding-top: 5px;
      border-top: 1px solid #dce3ea;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #526579;
    }

    @media print {
      html, body {
        width: auto;
        height: auto;
        margin: 0;
        background: white;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .toolbar {
        display: none !important;
      }

      .sheet {
        width: 100%;
        min-height: 0;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }

      .heading,
      .meta,
      .field,
      .documents,
      .footer {
        break-inside: avoid;
      }

      .section-title {
        break-after: avoid;
      }

      .field {
        min-height: 19px;
        padding: 2.5px 5px;
      }
    }

    @media screen and (max-width: 850px) {
      .sheet {
        margin: 10px auto;
      }
    }
  `;

  win.document.write(`
    <!doctype html>
    <html lang="sq">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Aplikimi ${esc(number)} - Besa Security</title>
      <style>${css}</style>
    </head>

    <body>

      <div class="toolbar">
        <button onclick="window.print()">
          Printo / Ruaj PDF
        </button>
        <button onclick="window.close()">
          Mbyll
        </button>
      </div>

      <main class="sheet">

        <header class="heading">
          <div class="brand">
            <img
              class="logo"
              src="${esc(logo)}"
              alt="Besa Security">

            <div>
              <div class="company">BESA SECURITY</div>
              <h1>FORMULARI I APLIKIMIT PER PUNE</h1>
              <div class="subtitle">
                Departamenti i Burimeve Njerezore
              </div>
            </div>
          </div>

          <div class="iso">
            ISO9001:2015 &amp; ISO14001:2015
            <small>v.1.1</small>
          </div>
        </header>

        <div class="meta">
          <div class="application-number">
            Nr. aplikimit: ${esc(number)}
          </div>
          <div>
            <strong>Data:</strong> ${esc(date)}
          </div>
          <div>
            <strong>Pozita:</strong> ${esc(d.pozita || '—')}
          </div>
          <div>
            <strong>Statusi:</strong>
            ${esc(record.status || 'I ri')}
          </div>
        </div>

        <h2 class="section-title">
          TE DHENAT E APLIKANTIT
        </h2>

        ${rows}

        ${extra ? `
          <h2 class="section-title">
            TE DHENA SHTESE
          </h2>
          ${extra}
        ` : ''}

        <h2 class="section-title">
          DOKUMENTET E BASHKENGJITURA
        </h2>

        <div class="documents">
          ${docs || 'Nuk ka dokumente'}
        </div>

        <div class="footer">
          <span>
            BESA SECURITY · Your safety, our promise.
          </span>
          <span>
            Nr. ${esc(number)}
          </span>
        </div>

      </main>
    </body>
    </html>
  `);

  win.document.close();
}

// ============================================
// START
// ============================================

refresh();
