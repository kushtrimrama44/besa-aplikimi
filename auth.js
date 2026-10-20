
'use strict';

// BESA SECURITY - Aplikim per Pune
// auth.js v1.6
// Raport A4, nje faqe, me poziten lart djathtas.

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
  arsyeja_statusit: 'Arsyeja / sqarimi'
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

function formatNumber(number) {
  return number == null
    ? 'Pa numer'
    : String(number).padStart(4, '0');
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

function displayValue(key, data) {
  let value = data[key];

  if (key === 'emri_bankes') {
    if (value === 'Tjeter' || value === 'Tjetër') {
      value = data.emri_bankes_tjeter || 'Tjeter';
    } else if (bankNames[value]) {
      value = bankNames[value] + ' (' + value + ')';
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

// ============================================
// SESIONI DHE AUTENTIKIMI
// ============================================

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

  const {
    data: { user },
    error
  } = await supa.auth.getUser();

  if (error || !user) {
    if (authStatus) authStatus.textContent = '';
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

    if (authStatus) {
      authStatus.textContent =
        'Llogaria nuk ka rol te autorizuar.';
    }
    return;
  }

  currentRole = roleResult.data.role;

  if (gate) gate.hidden = true;

  if (currentRole === 'hr') {
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

    const password = document.querySelector('#password')
      .value;

    const allowed = [
      'aplikant1',
      'aplikant2',
      'aplikant3',
      'admin'
    ];

    if (!allowed.includes(username)) {
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

// ============================================
// DERGIMI I APLIKIMIT
// ============================================

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

  const applicationId = crypto.randomUUID();
  const uploaded = [];

  try {
    for (const name of fileFields) {
      const file = fd.get(name);

      if (!file?.size) {
        if (requiredFiles.includes(name)) {
          throw new Error(
            'Dokumenti i detyrueshem mungon: ' +
            documentLabels[name]
          );
        }
        continue;
      }

      const extension = file.name
        .split('.')
        .pop()
        .toLowerCase();

      const allowedTypes = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png'
      };

      if (
        !allowedTypes[extension] ||
        file.type !== allowedTypes[extension] ||
        file.size > 5242880
      ) {
        throw new Error(
          'Dokument i pavlefshem: ' +
          documentLabels[name] +
          '. Lejohen PDF/JPG/PNG deri ne 5 MB.'
        );
      }

      const path =
        applicationId + '/' + name + '.' + extension;

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

    const {
      data: inserted,
      error
    } = await supa
      .from('applications')
      .insert({
        id: applicationId,
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
      id: applicationId,
      number: inserted?.application_number ?? null
    };

  } catch (error) {
    if (uploaded.length) {
      const cleanup = await supa.storage
        .from('application-documents')
        .remove(uploaded);

      if (cleanup.error) {
        console.error(
          'Dokumentet nuk u pastruan:',
          cleanup.error
        );
      }
    }

    throw error;
  }
}

window.besaSubmit = submitApplication;

// ============================================
// DASHBOARD HR
// ============================================

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
    .select(
      'id,application_number,created_at,data,status'
    )
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
      ' — ' +
      (d.pozita || '');

    card.append(heading);

    const meta = document.createElement('p');

    function updateMeta() {
      meta.textContent =
        new Date(record.created_at)
          .toLocaleString('sq-AL') +
        ' · ' +
        (record.status || 'I ri');
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
      button.textContent =
        'Hap ' + documentLabels[field];

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

// ============================================
// RAPORTI A4 - NJE FAQE
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

  // Nje rresht per secilen nga 24 fushat.
  const rows = ordered.map((key, index) =>
    '<div class="field">' +
      '<span class="field-label">' +
        (index + 1) + '. ' + esc(labels[key]) +
      '</span>' +
      '<span class="field-value">' +
        esc(displayValue(key, d)) +
      '</span>' +
    '</div>'
  ).join('');

  const extraKeys = [
    'patente',
    'statusi_ligjor',
    'arsyeja_statusit'
  ].filter(key => {
    const value = d[key];
    return value != null && String(value).trim() !== '';
  });

  const extra = extraKeys.map(key =>
    '<div class="field">' +
      '<span class="field-label">' +
        esc(labels[key] || key) +
      '</span>' +
      '<span class="field-value">' +
        esc(displayValue(key, d)) +
      '</span>' +
    '</div>'
  ).join('');

  const docs = allDocumentFields
    .filter(key => d[key])
    .map(key =>
      '<span class="doc">&#10003; ' +
        esc(documentLabels[key]) +
      '</span>'
    ).join('');

  const css = `
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #182d42;
      background: #e8edf2;
    }

    .toolbar {
      padding: 12px;
      text-align: center;
      background: #183852;
    }

    .toolbar button {
      padding: 10px 16px;
      margin: 0 5px;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
    }

    .sheet {
      width: 210mm;
      height: 297mm;
      margin: 12px auto;
      padding: 9mm 10mm;
      background: white;
      overflow: hidden;
      box-shadow: 0 3px 12px rgba(0,0,0,.12);
      position: relative;
    }

    .content {
      width: 100%;
      transform-origin: top left;
    }

    .heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #b42733;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .logo {
      width: 78px;
      max-height: 65px;
      object-fit: contain;
    }

    .company {
      font-size: 13px;
      font-weight: bold;
    }

    h1 {
      margin: 3px 0;
      font-size: 14px;
      line-height: 1.15;
    }

    .subtitle {
      font-size: 9px;
      color: #586b7e;
    }

    .iso {
      font-size: 8px;
      text-align: right;
      white-space: nowrap;
    }

    /* PANELI I SIPERM */
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 12px;
      margin: 9px 0;
      padding: 10px;
      background: #f0f3f6;
      font-size: 10px;
    }

    .meta-left {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }

    .meta-right {
      text-align: center;
      padding: 8px 12px;
      border-left: 2px solid #b42733;
      min-width: 0;
    }

    .position-label {
      display: block;
      font-size: 10px;
      font-weight: bold;
      color: #526579;
      letter-spacing: .5px;
      margin-bottom: 6px;
    }

    .position-value {
      font-size: 17px;
      font-weight: 800;
      color: #173b63;
      overflow-wrap: anywhere;
      line-height: 1.2;
    }

    .section-title {
      font-size: 11px;
      margin: 9px 0 4px;
      padding: 5px;
      background: #edf1f5;
      border-left: 3px solid #b42733;
    }

    .field {
      display: grid;
      grid-template-columns: 42% minmax(0, 58%);
      align-items: start;
      min-height: 21px;
      padding: 4px 5px;
      border-bottom: 1px solid #e0e5ea;
      font-size: 10px;
      line-height: 1.25;
      break-inside: avoid;
    }

    .field-label {
      font-weight: bold;
      padding-right: 8px;
      min-width: 0;
    }

    .field-value {
      overflow-wrap: anywhere;
      white-space: pre-line;
      min-width: 0;
    }

    .documents {
      display: flex;
      flex-wrap: wrap;
      gap: 5px 12px;
      padding: 6px;
      font-size: 9px;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #dce3e9;
      font-size: 9px;
    }

    @media print {
      html,
      body {
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: 0;
        background: white;
        overflow: hidden;
      }

      .toolbar {
        display: none !important;
      }

      .sheet {
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: 9mm 10mm;
        box-shadow: none;
        overflow: hidden;
        break-after: avoid;
      }

      .content {
        break-inside: avoid;
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

      .meta,
      .section-title {
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
      <meta name="viewport"
        content="width=device-width, initial-scale=1">
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
              <strong>
                ISO9001:2015 &amp; ISO14001:2015
              </strong>
              <div>v.1.1</div>
            </div>
          </header>

          <!-- POZITA LART DJATHTAS -->
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
              <span class="position-label">
                POZITA E APLIKUAR
              </span>

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
            <span>
              Nr. ${esc(number)}
            </span>
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

          const contentWidth = content.scrollWidth;
          const contentHeight = content.scrollHeight;

          const scale = Math.min(
            1,
            availableWidth / Math.max(contentWidth, 1),
            availableHeight / Math.max(contentHeight, 1)
          );

          content.style.transform =
            'scale(' + scale + ')';
        }

        function prepareAndPrint() {
          fitToA4();
          window.print();
        }

        window.addEventListener('load', fitToA4);
        window.addEventListener('beforeprint', fitToA4);
        window.addEventListener('resize', fitToA4);

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(fitToA4);
        }
      <\/script>

    </body>
    </html>
  `);

  win.document.close();
}

// ============================================
// START
// ============================================

refresh();
