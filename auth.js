
'use strict';

// BESA SECURITY - APLIKIM PER PUNE
// auth.js v2.3
// Raporti A4 - nje fushe per rresht
// Grupimet e kerkuara ne te njejtin rresht
// Pa zvogelim automatik te shkronjave

const cfg = window.BESA_CONFIG;

const supa =
  cfg?.url && cfg?.anonKey && window.supabase
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
const authStatus = document.querySelector('#authStatus');

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
  kartela_bankare_file: 'Vertetimi bankar',
  certifikata_trajnimi_file: 'Certifikata e trajnimeve',
  certifikata_shkollore_file: 'Certifikata shkollore'
};

const allDocumentFields = [
  ...fileFields,
  'leternjoftimi_file'
];

const labels = {
  emri: 'Emri',
  mbiemri: 'Mbiemri',
  emri_babait: 'Emri i babait',
  gjinia: 'Gjinia',
  data_lindjes: 'Data e lindjes',
  vendi_lindjes: 'Vendi i lindjes',
  email: 'Email',
  statusi_martesor: 'Statusi martesor',
  numri_leternjoftimit: 'Nr. i leternjoftimit',
  xhirollogaria: 'Xhirollogaria bankare',
  emri_bankes: 'Emri i bankes',
  adresa: 'Adresa',
  vendbanimi: 'Vendbanimi',
  telefoni: 'Nr. i telefonit',
  pergatitja_shkollore: 'Pergatitja shkollore',
  drejtimi: 'Drejtimi i shkollimit',
  trajnime: 'Trajnimet profesionale',
  pershkrim_trajnimeve: 'Pershkrimi i trajnimeve',
  patente: 'Patenta e shoferit',
  denuar: 'I denuar',
  gjatesia: 'Gjatesia (cm)',
  pesha: 'Pesha (kg)',
  perkatesia_etnike: 'Perkatesia etnike',
  kontakti_familjar: 'Kontakti familjar',
  lidhja_familjare: 'Lidhja familjare',
  telefoni_familjar: 'Telefoni familjar'
};

const bankNames = {
  RBKO: 'Raiffeisen Bank Kosovo',
  TEB: 'TEB',
  NLB: 'NLB Banka',
  PCB: 'ProCredit Bank',
  BKT: 'BKT Kosove',
  BPB: 'Banka per Biznes',
  BE: 'Banka Ekonomike',
  ZIRAAT: 'Ziraat Bank Kosova',
  CREDINS: 'Credins Kosove',
  PRIBANK: 'PriBank'
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function formatNumber(value) {
  return value == null
    ? 'Pa numer'
    : String(value).padStart(4, '0');
}

function patentValue(data) {
  const raw = data.kategorite;

  const categories = (
    Array.isArray(raw)
      ? raw
      : String(raw || '').split(',')
  )
    .map(x => String(x).trim())
    .filter(Boolean);

  const answer = String(data.patente || '')
    .trim()
    .toLowerCase();

  if (answer === 'jo' || answer === 'false') {
    return 'JO';
  }

  if (categories.length) {
    return 'PO - ' +
      (categories.length === 1
        ? 'Kategoria '
        : 'Kategorite ') +
      categories.join(', ');
  }

  if (answer === 'po' || answer === 'true') {
    return 'PO';
  }

  return data.patente || 'JO';
}

function displayValue(key, data) {
  if (key === 'patente') {
    return patentValue(data);
  }

  let value = data[key];

  if (key === 'emri_bankes') {
    if (value === 'Tjeter' || value === 'Tjetër') {
      value = data.emri_bankes_tjeter || value;
    } else {
      value = bankNames[value] || value;
    }
  }

  if (
    key === 'perkatesia_etnike' &&
    (value === 'Tjeter' || value === 'Tjetër')
  ) {
    value = data.perkatesia_tjeter || value;
  }

  if (Array.isArray(value)) {
    return value.join(', ') || '—';
  }

  return String(value ?? '').trim() || '—';
}

// =====================================
// LOGIN DHE AUTORIZIMI
// =====================================

async function refresh() {
  if (gate) gate.hidden = false;
  if (appView) appView.hidden = true;
  if (hrView) hrView.hidden = true;

  currentRole = null;

  if (!supa) {
    if (authStatus) {
      authStatus.textContent = 'Kontrollo config.js.';
    }
    return;
  }

  const { data, error } = await supa.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    if (authStatus) authStatus.textContent = '';
    return;
  }

  const roleResult = await supa
    .from('account_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = roleResult.data?.role;

  if (
    roleResult.error ||
    !['aplikant', 'hr'].includes(role)
  ) {
    if (authStatus) {
      authStatus.textContent =
        'Llogaria nuk ka rol te autorizuar.';
    }
    return;
  }

  currentRole = role;

  if (gate) gate.hidden = true;

  if (role === 'hr') {
    if (hrView) hrView.hidden = false;
    await loadHR();
  } else {
    if (appView) appView.hidden = false;

    const form = document.querySelector('#application');

    if (form) {
      form.reset();
      form.dispatchEvent(new Event('change'));
    }
  }
}

document.querySelector('#loginForm')
  ?.addEventListener('submit', async event => {
    event.preventDefault();

    if (!supa) {
      if (authStatus) {
        authStatus.textContent =
          'Supabase nuk eshte konfiguruar.';
      }
      return;
    }

    const username = document.querySelector('#username')
      .value.trim().toLowerCase();

    const password = document.querySelector('#password').value;

    if (![
      'aplikant1',
      'aplikant2',
      'aplikant3',
      'admin'
    ].includes(username)) {
      if (authStatus) {
        authStatus.textContent = 'Username i pavlefshem.';
      }
      return;
    }

    const { error } = await supa.auth.signInWithPassword({
      email: username + '@besa.login',
      password
    });

    if (error) {
      if (authStatus) {
        authStatus.textContent =
          'Kyçja deshtoi. Kontrollo kredencialet.';
      }
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

// =====================================
// DERGIMI I APLIKIMIT
// =====================================

async function submitApplication(form) {
  if (!supa || currentRole !== 'aplikant') {
    throw new Error('Nuk jeni i autorizuar.');
  }

  const fd = new FormData(form);
  const payload = {};

  for (const [key, value] of fd.entries()) {
    if (!(value instanceof File)) {
      payload[key] = value;
    }
  }

  payload.kategorite = fd.getAll('kategorite');
  payload.data_aplikimit = new Date().toISOString();

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
        throw new Error(
          'Ngarkimi deshtoi: ' + error.message
        );
      }

      uploaded.push(path);
      payload[name] = path;
    }

    const { data, error } = await supa
      .from('applications')
      .insert({ id, data: payload })
      .select('application_number')
      .single();

    if (error) {
      throw new Error(
        'Ruajtja deshtoi: ' + error.message
      );
    }

    form.reset();
    form.dispatchEvent(new Event('change'));

    return {
      id,
      number: data?.application_number ?? null
    };

  } catch (error) {
    if (uploaded.length) {
      const cleanup = await supa.storage
        .from('application-documents')
        .remove(uploaded);

      if (cleanup.error) {
        console.error('Pastrimi deshtoi:', cleanup.error);
      }
    }

    throw error;
  }
}

window.besaSubmit = submitApplication;

// =====================================
// HR DASHBOARD
// =====================================

async function loadHR() {
  const root = document.querySelector('#hrList');
  if (!root) return;

  root.textContent = 'Duke ngarkuar...';

  if (!supa) {
    root.textContent = 'Supabase nuk eshte konfiguruar.';
    return;
  }

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

    const title = document.createElement('h3');
    title.textContent =
      'Nr. ' + formatNumber(record.application_number) +
      ' · ' +
      [d.emri, d.mbiemri].filter(Boolean).join(' ') +
      ' — ' + (d.pozita || '');

    card.append(title);

    const meta = document.createElement('p');

    function updateMeta() {
      meta.textContent =
        new Date(record.created_at).toLocaleString('sq-AL') +
        ' · ' + (record.status || 'I ri');
    }

    updateMeta();
    card.append(meta);

    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.textContent = 'Shiko / Printo A4';

    printButton.onclick = () => printApplication(record);
    card.append(printButton);

    const select = document.createElement('select');

    for (const status of [
      'I ri',
      'Ne shqyrtim',
      'Interviste',
      'Pranuar',
      'Refuzuar'
    ]) {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
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
        updateMeta();
      }
    };

    card.append(select);

    for (const field of allDocumentFields) {
      if (!d[field]) continue;

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Hap ' + documentLabels[field];

      button.onclick = async () => {
        const { data: link, error } = await supa.storage
          .from('application-documents')
          .createSignedUrl(d[field], 60);

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
  ?.addEventListener('click', loadHR);

// =====================================
// RAPORTI A4 - VERSIONI I RI
// =====================================

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

  // Vetem keto fusha grupohen.
  // Cdo fushe tjeter ka rresht te vecante.

  const groups = [
    ['emri', 'emri_babait', 'mbiemri'],
    ['gjinia'],
    ['data_lindjes', 'vendi_lindjes'],
    ['email'],
    ['statusi_martesor'],
    ['numri_leternjoftimit'],
    ['xhirollogaria'],
    ['emri_bankes'],
    ['adresa', 'vendbanimi'],
    ['telefoni'],
    ['pergatitja_shkollore', 'drejtimi'],
    ['trajnime', 'pershkrim_trajnimeve'],
    ['patente'],
    ['denuar'],
    ['gjatesia'],
    ['pesha'],
    ['perkatesia_etnike'],
    ['kontakti_familjar'],
    ['lidhja_familjare'],
    ['telefoni_familjar']
  ];

  function visible(key) {
    if (key === 'drejtimi') {
      return String(d.pergatitja_shkollore || '')
        .trim().toLowerCase() !== 'fillore' &&
        !!String(d.pergatitja_shkollore || '').trim();
    }

    if (key === 'pershkrim_trajnimeve') {
      return String(d.trajnime || '')
        .trim().toLowerCase() === 'po';
    }

    return true;
  }

  let counter = 0;

  const rows = groups.map(group => {
    const keys = group.filter(visible);

    if (!keys.length) return '';

    const cells = keys.map(key => {
      counter++;

      return `
        <div class="field">
          <span class="field-label">
            ${counter}. ${esc(labels[key])}:
          </span>
          <span class="field-value">
            ${esc(displayValue(key, d))}
          </span>
        </div>
      `;
    }).join('');

    return `
      <div class="field-row cols-${keys.length}">
        ${cells}
      </div>
    `;
  }).join('');

  const documents = allDocumentFields
    .filter(key => d[key])
    .map(key => `
      <span class="document">
        &#10003; ${esc(documentLabels[key])}
      </span>
    `)
    .join('');

  const css = `
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #173650;
      background: #e8edf2;
    }

    .toolbar {
      padding: 12px;
      background: #173650;
      text-align: center;
    }

    .toolbar button {
      padding: 10px 18px;
      margin: 0 5px;
      cursor: pointer;
      border: none;
      border-radius: 4px;
      font-weight: bold;
    }

    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 12px auto;
      padding: 6mm 8mm;
      background: #fff;
      box-shadow: 0 3px 14px #0002;
    }

    .heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid #b52733;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .logo {
      width: 76px;
      max-height: 55px;
      object-fit: contain;
    }

    .company {
      font-size: 15px;
      font-weight: 800;
    }

    h1 {
      margin: 3px 0;
      font-size: 18px;
      line-height: 1.1;
    }

    .subtitle {
      font-size: 12px;
      color: #607183;
    }

    .iso-block {
      flex: 0 0 168px;
      font-size: 11px;
      line-height: 1.25;
      text-align: right;
    }

    .iso-version {
      margin-top: 2px;
      font-size: 10px;
    }

    .employment-fields {
      margin-top: 5px;
      text-align: left;
    }

    .employment-row {
      margin-top: 4px;
    }

    .employment-label {
      display: block;
      font-weight: bold;
    }

    .employment-line {
      height: 8px;
      border-bottom: 1px solid #708396;
    }

    .meta {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      align-items: center;
      gap: 8px;
      margin: 6px 0;
      padding: 7px 8px;
      background: #edf2f6;
      font-size: 13px;
    }

    .meta-left {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .meta-right {
      padding: 5px 8px;
      text-align: center;
      border-left: 2px solid #b52733;
    }

    .position-label {
      font-size: 12px;
      font-weight: bold;
      color: #526477;
    }

    .position-value {
      margin-top: 4px;
      font-size: 21px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .section-title {
      margin: 7px 0 4px;
      padding: 5px 7px;
      background: #edf2f6;
      border-left: 3px solid #b52733;
      font-size: 16px;
      font-weight: 800;
    }

    /* STRUKTURA E RE E RRESHTAVE */

    .fields-grid {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .field-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      min-height: 27px;
      border-bottom: 1px solid #dfe5eb;
      break-inside: avoid;
    }

    .field-row.cols-2 {
      grid-template-columns:
        minmax(0, 1fr)
        minmax(0, 1fr);
    }

    .field-row.cols-3 {
      grid-template-columns:
        minmax(0, 1fr)
        minmax(0, 1fr)
        minmax(0, 1fr);
    }

    .field {
      display: flex;
      flex-direction: row;
      align-items: baseline;
      flex-wrap: nowrap;
      gap: 5px;
      min-width: 0;
      padding: 4px 5px;
    }

    .field-label {
      flex: 0 0 auto;
      font-size: 12.5px;
      line-height: 1.2;
      font-weight: 700;
      color: #43566a;
      white-space: nowrap;
    }

    .field-value {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 15px;
      line-height: 1.2;
      font-weight: 700;
      color: #173650;
      overflow-wrap: anywhere;
    }

    .cols-3 .field {
      gap: 3px;
      padding-left: 2px;
      padding-right: 2px;
    }

    .cols-3 .field-label {
      font-size: 12.5px;
    }

    .documents {
      display: flex;
      flex-wrap: wrap;
      gap: 5px 12px;
      padding: 6px 4px;
      font-size: 12px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 7px;
      padding-top: 6px;
      border-top: 1px solid #dce3e9;
      font-size: 12px;
      color: #526477;
    }

    /* Vetem hapesirat zvogelohen nese duhet */

    .sheet.compact .field-row {
      min-height: 24px;
    }

    .sheet.compact .field {
      padding-top: 2px;
      padding-bottom: 2px;
    }

    .sheet.compact .section-title {
      margin-top: 4px;
      margin-bottom: 2px;
      padding-top: 3px;
      padding-bottom: 3px;
    }

    .sheet.compact .meta {
      padding-top: 4px;
      padding-bottom: 4px;
    }

    .overflow-warning {
      display: none;
      padding: 8px;
      margin: 10px auto;
      width: 210mm;
      background: #fff3d6;
      color: #744900;
      font-size: 13px;
    }

    .overflow-warning.visible {
      display: block;
    }

    @media print {
      html, body {
        margin: 0;
        padding: 0;
        background: white;
      }

      .toolbar,
      .overflow-warning {
        display: none !important;
      }

      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 0;
        padding: 6mm 8mm;
        box-shadow: none;
      }

      .meta,
      .section-title {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .field-row {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;

  win.document.open();

  win.document.write(`
    <!doctype html>
    <html lang="sq">
    <head>
      <meta charset="UTF-8">
      <title>
        Besa Security - Aplikimi ${esc(number)} - v2.3
      </title>
      <style>${css}</style>
    </head>

    <body>
      <div class="toolbar">
        <button onclick="prepareAndPrint()">
          Printo / Ruaj PDF
        </button>

        <button onclick="window.close()">
          Mbyll
        </button>
      </div>

      <div class="overflow-warning" id="overflowWarning">
        Raporti ka permbajtje me te gjate se nje faqe A4.
        Kontrollo Print Preview para printimit.
      </div>

      <main class="sheet" id="sheet">

        <header class="heading">
          <div class="brand">
            <img
              class="logo"
              src="${esc(logo)}"
              alt="Besa Security"
            >

            <div>
              <div class="company">
                BESA SECURITY
              </div>

              <h1>
                FORMULARI I APLIKIMIT PER PUNE
              </h1>

              <div class="subtitle">
                Departamenti i Burimeve Njerezore
              </div>
            </div>
          </div>

          <div class="iso-block">
            <strong>
              ISO9001:2015 &amp; ISO14001:2015
            </strong>

            <div class="iso-version">
              v.1.1
            </div>

            <div class="employment-fields">
              <div class="employment-row">
                <span class="employment-label">
                  Data e fillimit te punes
                </span>
                <div class="employment-line"></div>
              </div>

              <div class="employment-row">
                <span class="employment-label">
                  Vendi i punes
                </span>
                <div class="employment-line"></div>
              </div>
            </div>
          </div>
        </header>

        <div class="meta">
          <div class="meta-left">
            <div>
              <b>Nr. aplikimit:</b>
              ${esc(number)}
            </div>

            <div>
              <b>Data:</b>
              ${esc(date)}
            </div>

            <div>
              <b>Statusi:</b>
              ${esc(record.status || 'I ri')}
            </div>
          </div>

          <div class="meta-right">
            <div class="position-label">
              POZITA E APLIKUAR
            </div>

            <div class="position-value">
              ${esc(d.pozita || '—')}
            </div>
          </div>
        </div>

        <h2 class="section-title">
          TE DHENAT E APLIKANTIT
        </h2>

        <div class="fields-grid">
          ${rows}
        </div>

        <h2 class="section-title">
          DOKUMENTET E BASHKENGJITURA
        </h2>

        <div class="documents">
          ${documents || 'Nuk ka dokumente'}
        </div>

        <footer class="footer">
          <span>
            BESA SECURITY · Your safety, our promise.
          </span>

          <span>
            Nr. ${esc(number)}
          </span>
        </footer>

      </main>

      <script>
        function fitToA4() {
          const sheet = document.getElementById('sheet');
          const warning =
            document.getElementById('overflowWarning');

          if (!sheet) return;

          sheet.classList.remove('compact');

          const maxHeight = 297 * 96 / 25.4;
          const contentHeight = sheet.scrollHeight;

          if (contentHeight > maxHeight) {
            sheet.classList.add('compact');
          }

          const stillOverflow =
            sheet.scrollHeight > maxHeight + 2;

          if (warning) {
            warning.classList.toggle(
              'visible',
              stillOverflow
            );
          }
        }

        function prepareAndPrint() {
          fitToA4();
          window.print();
        }

        window.addEventListener('load', fitToA4);
        window.addEventListener('beforeprint', fitToA4);

        if (document.fonts) {
          document.fonts.ready.then(fitToA4);
        }
      <\/script>
    </body>
    </html>
  `);

  win.document.close();
}

// =====================================
// START
// =====================================

console.info('BESA SECURITY auth.js v2.3 loaded');

refresh();
