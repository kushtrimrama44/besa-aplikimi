# BESA SECURITY – Aplikim per Pune, Username Login

Ky eshte perditesim i ZIP-it v2.2 qe dergove. Hyrja pranon vetem `aplikant1`, `aplikant2`, `aplikant3`, `admin` dhe passwordin perkates te Supabase. Emaili teknik formohet automatikisht si `<username>@besa.login`.

## Instalimi ne GitHub Pages
1. Ne Supabase kontrollo qe 4 perdoruesit jane krijuar dhe rolet jane caktuar.
2. Ne `config.js` vendos URL e projektit dhe **publishable/anon key** nga Supabase. Asnjehere `service_role` ose secret key.
3. Ngarko ne root te repo GitHub `index.html`, `style.css`, `app.js`, `auth.js`, `config.js`, `besa-logo.png` (zevendeso ekzistuesit).
4. Testo hyrjen me secilin username.

**MOS ekzekuto `supabase-setup-OLD-DO-NOT-RUN.sql`:** eshte skedari historik nga ZIP-i i vjeter. Databaza jote eshte konfiguruar me SQL v6.

**KUFIZIM I RENDESISHEM:** Ky eshte prototip testues, jo sistem i audituar per mbledhje te dokumenteve personale. Llogarite e perbashketa nuk japin izolim individual. Dergimi i dokumenteve mund te lere fajlla pa lidhje me aplikimin nese ruajtja deshton. Duhet auditim RLS, validim server-side, menaxhim i sesioneve, politika e privatësise dhe testim para perdorimit real. Adresat `@besa.login` nuk marrin email per reset te passwordit.
