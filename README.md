# Besa Security – Aplikim per Pune v2 (Login + HR)

## Permbajtja
- `index.html`, `style.css`, `app.js`: formulari responsive, validimi dhe data e lindjes DD.MM.VVVV
- `auth.js`: kyçja me Supabase Auth, dergimi i aplikimit, dashboard HR, statuset dhe printimi A4
- `config.js`: konfigurimi publik i Supabase
- `supabase-setup.sql`: databaza, rolet, RLS dhe bucket privat

## Instalimi
1. Krijo projekt falas ne https://supabase.com .
2. Ne Supabase > Authentication > Users krijo 2 llogari me EMAIL dhe password te forte (nje per aplikant, nje per HR). Username praktikisht eshte email-i. Çaktivizo regjistrimin publik ne Authentication > Providers > Email / signups.
3. Ekzekuto `supabase-setup.sql` ne SQL Editor. Pastaj zevendeso email-at ne dy komandat `insert into public.account_roles` ne fund te SQL dhe ekzekutoji veçmas.
4. Te `config.js` vendos URL dhe anon/publishable key nga Supabase Project Settings > API. MOS vendos service_role key.
5. Ngarko fajllat e projektit ne GitHub repository. Settings > Pages > Deploy from a branch > main / root.
6. Testo me llogarine aplikant: ploteso formularin, bashkengjit PDF/JPG/PNG, dergo. Testo me HR: shiko aplikimin, dokumentet, statusin, printo A4.

## Siguria dhe kufizimet
- Login eshte REAL vetem pas konfigurimit te Supabase. Nuk ka passworde te integruara ne kod.
- RLS ndalon aplikantin te lexoje aplikime, HR mund t'i lexoje. Dokumentet jane private.
- Nje llogari e perbashket aplikanti nuk jep izolim te plote te sesioneve ne pajisje te perbashketa. Bej logout pas aplikimit. Per perdorim publik me te dhena shume sensitive, rekomandohet llogari individuale per aplikant ose server-side session isolation.
- Aplikimet ruhen si JSON; SQL kontrollon rolin, por nuk validon çdo fushe server-side. Per prodhim shto validim ne server/Edge Function, rate limiting, audit log, retention policy, backup, njoftim privatësie dhe kufizime sipas ligjit.
- Per shkak te natyres sensitive, kerko vleresim ligjor per etnine, historikun penal, dokumentin e identitetit dhe te dhenat bankare. Prefero vertetim bankar IBAN ne vend te fotografise se karteles bankare.
- Upload-et qe deshtojne mund te lene dokumente pa aplikim ne storage; admin duhet te kontrolloje/te pastroje objektet e paperdorura.
- Plani falas ka kufij dhe mund te ndryshoje.

## Logo
Logo zyrtare e derguar nga perdoruesi eshte ne `besa-logo.png` dhe shfaqet ne krye te faqes, favicon dhe printimin A4.
