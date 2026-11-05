
'use strict';

// BESA SECURITY - Aplikim per Pune
// auth.js v2.0 - raport A4 me shkronja me te medha

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
  email: 'Email',
  statusi_martesor: 'Statusi martesor',
  numri_leternjoftimit: 'Nr. i leternjoftimit',
  xhirollogaria: 'Xhirollogaria bankare',
  emri_bankes: 'Emri i bankes',
  adresa: 'Adresa',
  vendbanimi: 'Vendbanimi',
  telefoni: 'Nr. i telefonit',
  drejtimi: 'Drejtimi i shkollimit',
  trajnime: 'Trajnimet profesionale',
  pershkrim_trajnimeve: 'Pershkrimi i trajnimeve',
  patente: 'Patenta e shoferit',
  denuar: 'I denuar',
  gjatesia: 'Gjatesia (cm)',
  pesha: 'Pesha (kg)',
  perkatesia_etnike: 'Perkatesia etnike',
  pergatitja_shkollore: 'Pergatitja shkollore',
  kontakti_familjar: 'Kontakti familjar',
  lidhja_familjare: 'Lidhja familjare',
  telefoni_familjar: 'Telefoni familjar'
};

const ordered = [
  'emri',
  'mbiemri',
  'emri_babait',
  'gjinia',
  'data_lindjes',
  'vendi_lindjes',
  'email',
  'statusi_martesor',
  'numri_leternjoftimit',
  'xhirollogaria',
  'emri_bankes',
  'adresa',
  'vendbanimi',
  'telefoni',
  'pergatitja_shkollore',
  'drejtimi',
  'trajnime',
  'pershkrim_trajnimeve',
  'patente',
  'denuar',
  'gjatesia',
  'pesha',
  'perkatesia_etnike',
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

function formatNumber(value) {
  return value == null
    ? 'Pa numer'
    : String(value).padStart(4, '0');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function patentValue(data) {
  const raw = data.kategorite;

  const categories = (
    Array.isArray(raw)
      ? raw
      : String(raw || '').split(',')
  )
    .map(item => String(item).trim())
    .filter(Boolean);

  const explicit = String(data.patente || '')
    .trim()
    .toLowerCase();

  if (
    explicit === 'jo' ||
    explicit === 'nuk ka' ||
    explicit === 'false'
  ) {
    return 'JO';
  }

  if (categories.length) {
    return 'PO - ' +
      (categories.length === 1
        ? 'Kategoria '
        : 'Kategorite ') +
      categories.join(', ');
  }

  if (
    explicit === 'po' ||
    explicit === 'true'
  ) {
    return 'PO';
  }

  if (explicit && explicit !== '—') {
    return data.patente;
  }

  return 'JO';
}

function displayValue(key, data) {
  if (key === 'patente') {
    return patentValue(data);
  }

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

// ==========================================
// AUTENTIKIMI
// ==========================================

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

  const { data: userData, error } = await supa.auth.getUser();
  const user = userData?.user;

  if (error || !user) {
    if (authStatus) authStatus.textContent = '';
    return;
  }

  const result = await supa
    .from('account_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = result.data?.role;

  if (
    result.error ||
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
      authStatus.textContent =
        'Supabase nuk eshte konfiguruar.';
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
      authStatus.textContent =
        'Kyçja deshtoi. Kontrollo kredencialet.';
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

// ==========================================
// RUAJTJA E APLIKIMIT
// ==========================================

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
      .insert({
        id,
        data: payload
      })
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

// ==========================================
// HR DASHBOARD
// ==========================================

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
  ?.addEventListener('click', loadHR);

// ==========================================
// PRINTIMI A4 - NJE FAQE
// ==========================================

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

  // Fushat e fshehura ne formular nuk shfaqen ne raport.
  const visibleKeys = ordered.filter(key => {
    if (key === 'pershkrim_trajnimeve') {
      return String(d.trajnime || '').toLowerCase() === 'po';
    }
    if (key === 'drejtimi') {
      return d.pergatitja_shkollore !== 'Fillore' &&
        String(d.pergatitja_shkollore || '').trim() !== '';
    }
    return true;
  });

  const rows = visibleKeys.map((key, index) => `
    <div class="field">
      <span class="field-label">
        ${index + 1}. ${esc(labels[key])}
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
      font-family: Arial, Helvetica, sans-serif;
      color: #18324a;
      background: #e8edf2;
    }

    .toolbar {
      padding: 12px;
      text-align: center;
      background: #173650;
    }

    .toolbar button {
      padding: 10px 18px;
      margin: 0 5px;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
    }

    .sheet {
      width: 209mm;
      height: 296mm;
      margin: 12px auto;
      padding: 5mm 8mm;
      background: white;
      overflow: hidden;
      box-shadow: 0 3px 14px #0002;
      position: relative;
    }

    /* Nivele kompaktimi: shkronjat e medha ruhen sa me gjate. */
    .sheet.compact-1 .field { padding-top: 1.5px; padding-bottom: 1.5px; min-height: 18px; }
    .sheet.compact-1 .heading { padding-bottom: 2px; }
    .sheet.compact-1 .section-title { margin-top: 2px; padding-top: 2px; padding-bottom: 2px; }
    .sheet.compact-2 .field { font-size: 12px; padding-top: 1px; padding-bottom: 1px; min-height: 17px; }
    .sheet.compact-2 .meta { padding-top: 3px; padding-bottom: 3px; }
    .sheet.compact-3 .field { font-size: 11.5px; line-height: 1.12; min-height: 16px; }
    .sheet.compact-3 .documents { font-size: 10px; }

    .content {
      width: 100%;
      transform-origin: top left;
    }

    .heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding-bottom: 4px;
      border-bottom: 2px solid #b52733;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .logo {
      width: 75px;
      max-height: 54px;
      object-fit: contain;
    }

    .company {
      font-size: 13px;
      font-weight: 800;
    }

    h1 {
      margin: 3px 0;
      font-size: 16px;
      line-height: 1.15;
    }

    .subtitle {
      font-size: 11.5px;
      color: #607183;
    }

    .iso-block {
      flex: 0 0 170px;
      text-align: right;
      font-size: 11.5px;
      line-height: 1.35;
    }

    .iso-version {
      font-size: 9px;
      margin-top: 2px;
    }

    .employment-fields {
      margin-top: 6px;
      text-align: left;
      font-size: 11.5px;
    }

    .employment-row {
      margin-top: 5px;
    }

    .employment-label {
      display: block;
      font-weight: bold;
      margin-bottom: 3px;
    }

    .employment-line {
      height: 8px;
      border-bottom: 1px solid #6f8193;
    }

    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 8px;
      margin: 5px 0;
      padding: 5px 8px;
      background: #eef2f6;
      font-size: 11.5px;
    }

    .meta-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-right {
      min-width: 0;
      padding: 5px 8px;
      text-align: center;
      border-left: 2px solid #b52733;
    }

    .position-label {
      font-size: 11.5px;
      font-weight: bold;
      color: #526477;
      letter-spacing: .3px;
    }

    .position-value {
      margin-top: 5px;
      font-size: 19px;
      font-weight: 800;
      color: #173650;
      overflow-wrap: anywhere;
    }

    .section-title {
      margin: 4px 0 2px;
      padding: 3px 6px;
      font-size: 13px;
      background: #edf2f6;
      border-left: 3px solid #b52733;
    }

    .field {
      display: grid;
      grid-template-columns: 43% minmax(0,57%);
      align-items: start;
      min-height: 20px;
      padding: 2.5px 5px;
      border-bottom: 1px solid #dfe5eb;
      font-size: 12.5px;
      line-height: 1.17;
      break-inside: avoid;
    }

    .field-label {
      font-weight: bold;
      color: #43566a;
      padding-right: 8px;
    }

    .field-value {
      min-width: 0;
      overflow-wrap: anywhere;
      white-space: pre-line;
    }

    .documents {
      display: flex;
      flex-wrap: wrap;
      gap: 3px 9px;
      padding: 5px;
      font-size: 10.5px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #dce3e9;
      font-size: 11.5px;
      color: #526477;
    }

    @media print {
      html, body {
        width: 210mm;
        height: 297mm;
        overflow: hidden !important;
        background: white;
      }

      .toolbar {
        display: none !important;
      }

      .sheet {
        width: 209mm;
        height: 296mm;
        margin: 0 !important;
        padding: 5mm 8mm;
        box-shadow: none;
        overflow: hidden !important;
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
              <img class="logo"
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

            <div class="iso-block">
              <strong>
                ISO9001:2015 &amp; ISO14001:2015
              </strong>
              <div class="iso-version">v.1.1</div>

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
                <b>Nr. aplikimit:</b> ${esc(number)}
              </div>
              <div>
                <b>Data:</b> ${esc(date)}
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

          sheet.classList.remove('compact-1', 'compact-2', 'compact-3');
          content.style.transform = 'none';
          content.style.width = '100%';

          const style = getComputedStyle(sheet);
          const availableWidth = sheet.clientWidth -
            parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2;
          const availableHeight = sheet.clientHeight -
            parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 2;

          // Fillimisht zvogelohen hapesirat, jo shkronjat.
          for (const level of ['compact-1', 'compact-2', 'compact-3']) {
            if (content.scrollHeight <= availableHeight &&
                content.scrollWidth <= availableWidth) break;
            sheet.classList.add(level);
          }

          // Vetem per te dhena shume te gjata perdoret shkallezimi.
          const scale = Math.min(
            1,
            availableWidth / Math.max(content.scrollWidth, 1),
            availableHeight / Math.max(content.scrollHeight, 1)
          );
          content.style.transform = 'scale(' + scale + ')';
        }

        function prepareAndPrint() {
          fitToA4();
          window.print();
        }

        window.addEventListener('load', fitToA4);
        window.addEventListener('beforeprint', fitToA4);
        window.addEventListener('resize', fitToA4);

        if (document.fonts) {
          document.fonts.ready.then(fitToA4);
        }
      <\/script>

    </body>
    </html>
  `);

  win.document.close();
}

// ==========================================
// START
// ==========================================

refresh();
