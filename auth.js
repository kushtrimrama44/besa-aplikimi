
'use strict';

// BESA SECURITY - Aplikim per Pune
// auth.js v1.7 - Raport kompakt, nje faqe A4

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
  arsyeja_statusit: 'Arsyeja / sqarimi'
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

function formatNumber(n) {
  return n == null ? 'Pa numer' : String(n).padStart(4, '0');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function displayValue(key, data) {
  let value = data[key];

  if (key === 'emri_bankes') {
    if (value === 'Tjeter' || value === 'Tjetër') {
      value = data.emri_bankes_tjeter || 'Tjeter';
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

// --------------------------------------------
// LOGIN
// --------------------------------------------

async function refresh() {
  gate.hidden = false;
  appView.hidden = true;
  hrView.hidden = true;
  currentRole = null;

  if (!supa) {
    authStatus.textContent = 'Kontrollo config.js.';
    return;
  }

  const { data: userData, error } = await supa.auth.getUser();
  const user = userData?.user;

  if (error || !user) {
    authStatus.textContent = '';
    return;
  }

  const result = await supa
    .from('account_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = result.data?.role;

  if (result.error || !['aplikant', 'hr'].includes(role)) {
    await supa.auth.signOut();
    authStatus.textContent = 'Llogaria nuk eshte e autorizuar.';
    return;
  }

  currentRole = role;
  gate.hidden = true;

  if (role === 'hr') {
    hrView.hidden = false;
    await loadHR();
  } else {
    appView.hidden = false;
    const form = document.querySelector('#application');
    form.reset();
    form.dispatchEvent(new Event('change'));
  }
}

document.querySelector('#loginForm').addEventListener(
  'submit',
  async event => {
    event.preventDefault();

    if (!supa) {
      authStatus.textContent = 'Supabase nuk eshte konfiguruar.';
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
      authStatus.textContent = 'Username i pavlefshem.';
      return;
    }

    const { error } = await supa.auth.signInWithPassword({
      email: username + '@besa.login',
      password
    });

    if (error) {
      authStatus.textContent = 'Kyçja deshtoi.';
      return;
    }

    await refresh();
  }
);

document.querySelectorAll('.logout').forEach(button => {
  button.addEventListener('click', async () => {
    if (supa) await supa.auth.signOut();
    await refresh();
  });
});

// --------------------------------------------
// RUAJTJA E APLIKIMIT
// --------------------------------------------

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

      if (error) throw new Error(error.message);

      uploaded.push(path);
      payload[name] = path;
    }

    const { data, error } = await supa
      .from('applications')
      .insert({ id, data: payload })
      .select('application_number')
      .single();

    if (error) throw new Error(error.message);

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

// --------------------------------------------
// DASHBOARD HR
// --------------------------------------------

async function loadHR() {
  const root = document.querySelector('#hrList');

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
  .addEventListener('click', loadHR);

// --------------------------------------------
// PRINTIMI A4
// --------------------------------------------

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

  const rows = ordered.map((key, i) => `
    <div class="field">
      <span class="field-label">
        ${i + 1}. ${esc(labels[key])}
      </span>
      <span class="field-value">
        ${esc(displayValue(key, d))}
      </span>
    </div>
  `).join('');

  // Pozita nuk futet te te dhenat shtese.
  const extraKeys = [
    'patente',
    'statusi_ligjor',
    'arsyeja_statusit'
  ].filter(key => {
    const value = d[key];
    return value != null && String(value).trim() !== '';
  });

  const extra = extraKeys.map(key => `
    <div class="field">
      <span class="field-label">
        ${esc(labels[key])}
      </span>
      <span class="field-value">
        ${esc(displayValue(key, d))}
      </span>
    </div>
  `).join('');

  const docs = allDocumentFields
    .filter(key => d[key])
    .map(key => `
      <span class="doc">
        &#10003; ${esc(documentLabels[key])}
      </span>
    `).join('');

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
      font-family: Arial, sans-serif;
      color: #18324a;
      background: #e8edf2;
    }

    .toolbar {
      text-align: center;
      background: #173650;
      padding: 12px;
    }

    .toolbar button {
      padding: 10px 18px;
      margin: 0 5px;
      cursor: pointer;
      border: 0;
      border-radius: 4px;
    }

    .sheet {
      width: 209mm;
      height: 296mm;
      margin: 12px auto;
      padding: 8mm 9mm;
      background: white;
      overflow: hidden;
      box-shadow: 0 3px 14px #0002;
    }

    .content {
      width: 100%;
      transform-origin: top left;
    }

    .heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border-bottom: 2px solid #b52733;
      padding-bottom: 6px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .logo {
      width: 78px;
      max-height: 55px;
      object-fit: contain;
    }

    .company {
      font-size: 11px;
      font-weight: 800;
    }

    h1 {
      font-size: 13px;
      margin: 3px 0;
      line-height: 1.15;
    }

    .subtitle {
      font-size: 8px;
      color: #607183;
    }

    .iso {
      font-size: 8px;
      text-align: right;
      white-space: nowrap;
      align-self: flex-start;
    }

    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 8px;
      margin: 7px 0;
      padding: 8px 10px;
      background: #eef2f6;
      font-size: 9px;
    }

    .meta-left {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .meta-right {
      border-left: 2px solid #b52733;
      text-align: center;
      padding: 6px 8px;
      min-width: 0;
    }

    .position-label {
      font-size: 9px;
      font-weight: bold;
      color: #526477;
      letter-spacing: .4px;
    }

    .position-value {
      margin-top: 5px;
      font-size: 16px;
      font-weight: 800;
      color: #173650;
      overflow-wrap: anywhere;
    }

    .section-title {
      font-size: 10px;
      margin: 7px 0 3px;
      padding: 4px 6px;
      background: #edf2f6;
      border-left: 3px solid #b52733;
    }

    .field {
      display: grid;
      grid-template-columns: 44% minmax(0, 56%);
      align-items: center;
      gap: 4px;
      min-height: 19px;
      padding: 2px 5px;
      border-bottom: 1px solid #dfe5eb;
      font-size: 9px;
      line-height: 1.2;
    }

    .field-label {
      font-weight: bold;
      color: #43566a;
    }

    .field-value {
      min-width: 0;
      overflow-wrap: anywhere;
      white-space: pre-line;
    }

    .documents {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      padding: 4px;
      font-size: 8px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 7px;
      padding-top: 5px;
      border-top: 1px solid #dce3e9;
      font-size: 8px;
      color: #526477;
    }

    @media print {
      html, body {
        width: 210mm;
        height: 297mm;
        overflow: hidden;
        background: white;
      }

      .toolbar {
        display: none !important;
      }

      .sheet {
        width: 209mm;
        height: 296mm;
        margin: 0;
        padding: 8mm 9mm;
        box-shadow: none;
        overflow: hidden;
        break-after: avoid;
        page-break-after: avoid;
      }

      .meta, .section-title {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;

  win.document.write(`
    <!doctype html>
    <html lang="sq">
    <head>
      <meta charset="UTF-8">
      <title>Aplikimi ${esc(number)} - Besa Security</title>
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

      <main class="sheet" id="sheet">
        <div class="content" id="content">

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
              <b>ISO9001:2015 &amp; ISO14001:2015</b>
              <div>v.1.1</div>
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
            <span>Nr. ${esc(number)}</span>
          </div>

        </div>
      </main>

      <script>
        function fitToA4() {
          const sheet = document.getElementById('sheet');
          const content = document.getElementById('content');

          if (!sheet || !content) return;

          content.style.transform = 'none';
          content.style.width = '100%';

          const style = getComputedStyle(sheet);

          const availableWidth =
            sheet.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight);

          const availableHeight =
            sheet.clientHeight -
            parseFloat(style.paddingTop) -
            parseFloat(style.paddingBottom);

          const naturalWidth = content.scrollWidth;
          const naturalHeight = content.scrollHeight;

          const scale = Math.min(
            1,
            availableWidth / Math.max(naturalWidth, 1),
            availableHeight / Math.max(naturalHeight, 1)
          );

          content.style.transform = 'scale(' + scale + ')';
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

refresh();
