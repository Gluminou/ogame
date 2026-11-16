// OGame planner engine: parse export text, compute production, energy, storage, ROI and recommendations.
const OG = (() => {
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  // key -> list of accepted (normalized) labels
  const LABELS = {
    metal: ['mine de metal'], crystal: ['mine de cristal'], deut: ['synthetiseur de deuterium'],
    solar: ['centrale electrique solaire'], fusion: ['centrale electrique de fusion'], sats: ['satellite solaire'],
    stM: ['hangar de metal'], stC: ['hangar de cristal'], stD: ['reservoir de deuterium'], crawlers: ['foreuse'],
    lfRes: ['secteur residentiel'], lfFarm: ['ferme biospherique'], lfRC: ['centre de recherche'], lfAcad: ['academie des sciences'],
    lfNeuro: ['centre de neurocalibrage'], lfHES: ['fusion a haute energie'], lfFood: ['reserve alimentaire'], lfFPP: ['extraction par fusion'],
    lfTower: ['tour d habitation'], lfBio: ['laboratoire de biotechnologie'], lfMetro: ['metropolis'], lfShield: ['bouclient planetaire', 'bouclier planetaire'],
    robots: ['usine de robots'], shipyard: ['chantier spatial'], lab: ['laboratoire de recherche'], depot: ['depot de ravitaillement'],
    silo: ['silo de missiles'], nanite: ['usine de nanites'], terra: ['terraformeur'], dock: ['dock spatial'], scanner: ['scanner d anomalies interstellaire'],
    tempMax: ['temperature max', 'temperature maximale', 'temp max'],
    dRL: ['lanceur de missiles'], dLL: ['artillerie laser legere'], dHL: ['artillerie laser lourde'], dGauss: ['canon de gauss'], dIon: ['artillerie a ions'],
    dPlasma: ['lanceur de plasma'], dSS: ['petit bouclier'], dLS: ['grand bouclier'], dABM: ['missile d interception'], dIPM: ['missile interplanetaire'],
    sLF: ['chasseur leger'], sHF: ['chasseeur lourd', 'chasseur lourd'], sCr: ['croiseur'], sBS: ['vaisseau de bataille'], sBC: ['traqueur'], sBo: ['bombardier'],
    sDe: ['destructeur'], sRIP: ['etoile de la mort'], sRe: ['faucheur'], sPF: ['eclaireur'], sSC: ['petit transporteur'], sLC: ['grand transporteur'],
    sCol: ['vaisseau de colonisation'], sRec: ['recycleur'], sProbe: ['sonde d espionnage'],
    // research
    rEnergy: ['technologie energetique'], rLaser: ['technologie laser'], rIon: ['technologie a ions'], rHyper: ['technologie hyperespace'],
    rPlasma: ['technologie plasma'], rComb: ['reacteur a combustion'], rImp: ['reacteur a impulsion'], rHD: ['propulsion hyperespace'],
    rEsp: ['technologie espionnage'], rComp: ['technologie ordinateur'], rAstro: ['astrophysique'], rIRN: ['reseau de recherche intergalactique'],
    rGrav: ['technologie graviton'], rWeap: ['technologie armes'], rShield: ['technologie bouclier'], rArmour: ['technologie protection des vaisseaux spatiaux'],
  };
  const LF_LABELS = {
    lfRes: ['secteur residentiel'], lfFarm: ['ferme biospherique'], lfRC: ['centre de recherche'], lfAcad: ['academie des sciences'],
    lfNeuro: ['centre de neurocalibrage'], lfHES: ['fusion a haute energie'], lfFood: ['reserve alimentaire'], lfFPP: ['extraction par fusion'],
    lfTower: ['tour d habitation'], lfBio: ['laboratoire de biotechnologie'], lfMetro: ['metropolis'], lfShield: ['bouclient planetaire', 'bouclier planetaire'],
    rtEnclave: ['enclave stoique', 'enclave meditative'], rtFarm: ['culture du cristal', 'ferme cristalline'], rtRTech: ['centre technologique runique'],
    rtForge: ['forge runique'], rtOrik: ['orictorium', 'oriktorium'], rtMagma: ['fusion magmatique', 'forge magmatique'], rtDisrupt: ['chambre de disruption'],
    rtMonument: ['monument rocheux'], rtRefinery: ['raffinerie de cristaux'], rtDeutSynth: ['synthetiseur de deuterium'], rtMinRC: ['centre de recherche sur les mineraux'],
    rtHighYield: ['usine de traitement a haut rendement'],
  };
  const LF_LOOKUP = {};
  for (const [k, arr] of Object.entries(LF_LABELS)) for (const l of arr) LF_LOOKUP[l] = k;
  const LOOKUP = {};
  for (const [k, arr] of Object.entries(LABELS)) for (const l of arr) LOOKUP[l] = k;

  // lifeform research (tier 1 names, FR). eff = production bonus per level on all resources
  const LFR = {
    'ambassadeurs intergalactiques': { name: 'Ambassadeurs intergalactiques', race: 'Humains', role: 'envoys' },
    'extracteurs a haute performance': { name: 'Extracteurs à haute performance', race: 'Humains', role: 'prod', eff: 0.0006 },
    'moteurs a fusion': { name: 'Moteurs à fusion', race: 'Humains', role: 'speed' },
    'generateur de champ de camouflage': { name: 'Générateur de champ de camouflage', race: 'Humains', role: 'spy' },
    'planque orbitale': { name: 'Planque orbitale', race: 'Humains', role: 'hide' },
    'ia de recherche': { name: 'IA de recherche', race: 'Humains', role: 'research' },
    'batteries volcaniques': { name: 'Batteries volcaniques', race: "Rock'tal", role: 'energy' },
    'batteries volaniques': { name: 'Batteries volcaniques', race: "Rock'tal", role: 'energy' },
  };

  function parse(text) {
    const planets = []; const research = {}; const server = {}; let cur = null; let sec = ''; let exportedAt = null; let officers = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim(); if (!line) continue;
      const m = line.match(/^([^:]+?)\s*:\s*(.*)$/);
      if (!m) { if (sec !== 'server') sec = norm(line); else { const nl = norm(line); const pc = (line.match(/([+-]?\d+)\s*%/) || [])[1];
        if (nl.includes('deuterium dans les champs de debris')) server.dfDeut = true;
        else if (nl.startsWith('flotte dans le champ de debris') && pc != null) server.dfShips = +pc;
        else if (nl.startsWith('installations de defense dans le champ de debris') && pc != null) server.dfDef = +pc; } continue; } // header line without colon
      const label = norm(m[1]); const val = m[2].trim();
      if (label === 'date export') { exportedAt = +val || Date.parse(val) || null; continue; }
      if (label === 'officiers actifs') { officers = val.toLowerCase().split(/[,\s]+/).filter(Boolean); continue; }
      if (label === 'planete') { cur = { name: val, coords: null, pos: 8, b: {}, lfr: {} }; planets.push(cur); sec = ''; continue; }
      if (label === 'coordonnees') { if (cur) { cur.coords = val; const p = val.split(':').map(Number); cur.pos = p[2] || 8; cur.gal = p[0]; cur.sys = p[1]; } continue; }
      if (label === 'recherche' && !val) { sec = 'research'; continue; }
      if (label === 'recherche forme de vie' || label === 'recherches forme de vie' || label === 'recherche formes de vie') { sec = 'lfr'; continue; }
      if (label === 'parametres de serveur' || label === 'parametres du serveur') { sec = 'server'; continue; }
      if (sec === 'server') {
        const x = val.match(/x\s*([\d.,]+)/i); const n = x ? parseFloat(x[1].replace(',', '.')) : parseFloat(val.replace(',', '.'));
        if (label.startsWith('vitesse de developpement') || label.startsWith('vitesse economique')) server.speed = n;
        else if (label.startsWith('vitesse de recherche')) server.researchSpeed = n;
        else if (label.startsWith('nombre de galaxies')) server.galaxies = n;
        else if (label.startsWith('vitesse de flotte des unites pacifiques')) server.speedPeace = n;
        else if (label.startsWith('vitesse de flotte des unites de guerre')) server.speedWar = n;
        else if (label.startsWith('points du top 1')) server.top1 = parseInt(val.replace(/[^\d]/g, ''), 10);
        else if (label.startsWith('flotte dans le champ de debris')) server.dfShips = n;
        else if (label.startsWith('installations de defense dans le champ de debris')) server.dfDef = n;
        continue;
      }
      if (!val) { sec = label; continue; } // "Defense:", "Flotte:" headers
      const num = parseInt(val.replace(/[^\d-]/g, ''), 10); if (isNaN(num)) continue;
      if (sec === 'lfr') { if (cur) cur.lfr[label] = num; continue; }
      if (sec === 'stock') { const SK = { metal: 'm', cristal: 'c', deuterium: 'd', energie: 'e', population: 'pop', nourriture: 'food', 'production metal': 'prodm', 'production cristal': 'prodc', 'production deuterium': 'prodd', 'capacite metal': 'capm', 'capacite cristal': 'capc', 'capacite deuterium': 'capd', 'production energie': 'eProd', 'consommation energie': 'eUse', 'production metal par seconde': 'prodpsm', 'production cristal par seconde': 'prodpsc', 'production deuterium par seconde': 'prodpsd' }[label];
        if (cur && SK) { cur.stock = cur.stock || {}; cur.stock[SK] = /par seconde/.test(label) ? parseFloat(val.replace(',', '.')) : num; } continue; }
      if (sec === 'forme de vie' || sec === 'formes de vie') { const lk = LF_LOOKUP[label]; if (cur && lk) cur.b[lk] = num; continue; }
      const key = LOOKUP[label]; if (!key) continue;
      if (/^r[A-Z]/.test(key)) research[key] = num;
      else if (cur && sec !== 'research') cur.b[key] = num;
    }
    return { planets, research, server, exportedAt, officers };
  }

  const POS_TEMP = { 1: 240, 2: 190, 3: 140, 4: 90, 5: 80, 6: 70, 7: 60, 8: 50, 9: 40, 10: 30, 11: 20, 12: 10, 13: -30, 14: -70, 15: -110 };
  const METAL_POS = { 6: 0.17, 7: 0.23, 8: 0.35, 9: 0.23, 10: 0.17 };
  const CRYS_POS = { 1: 0.40, 2: 0.30, 3: 0.20 };

  const cost = {
    metal: n => [60 * 1.5 ** (n - 1), 15 * 1.5 ** (n - 1), 0],
    crystal: n => [48 * 1.6 ** (n - 1), 24 * 1.6 ** (n - 1), 0],
    deut: n => [225 * 1.5 ** (n - 1), 75 * 1.5 ** (n - 1), 0],
    solar: n => [75 * 1.5 ** (n - 1), 30 * 1.5 ** (n - 1), 0],
    fusion: n => [900 * 1.8 ** (n - 1), 360 * 1.8 ** (n - 1), 180 * 1.8 ** (n - 1)],
    stM: n => [1000 * 2 ** (n - 1), 0, 0],
    stC: n => [1000 * 2 ** (n - 1), 500 * 2 ** (n - 1), 0],
    stD: n => [1000 * 2 ** (n - 1), 1000 * 2 ** (n - 1), 0],
    robots: n => [400 * 2 ** (n - 1), 120 * 2 ** (n - 1), 200 * 2 ** (n - 1)],
    shipyard: n => [400 * 2 ** (n - 1), 200 * 2 ** (n - 1), 100 * 2 ** (n - 1)],
    lab: n => [200 * 2 ** (n - 1), 400 * 2 ** (n - 1), 200 * 2 ** (n - 1)],
    nanite: n => [1e6 * 2 ** (n - 1), 5e5 * 2 ** (n - 1), 1e5 * 2 ** (n - 1)],
    rPlasma: n => [2000 * 2 ** (n - 1), 4000 * 2 ** (n - 1), 1000 * 2 ** (n - 1)],
    rAstro: n => [4000 * 1.75 ** (n - 1), 8000 * 1.75 ** (n - 1), 4000 * 1.75 ** (n - 1)].map(x => Math.round(x / 100) * 100),
    rComp: n => [0, 400 * 2 ** (n - 1), 600 * 2 ** (n - 1)],
    rEnergy: n => [0, 800 * 2 ** (n - 1), 400 * 2 ** (n - 1)],
    rIRN: n => [240000 * 2 ** (n - 1), 400000 * 2 ** (n - 1), 160000 * 2 ** (n - 1)],
    rWeap: n => [800 * 2 ** (n - 1), 200 * 2 ** (n - 1), 0],
    rShield: n => [200 * 2 ** (n - 1), 600 * 2 ** (n - 1), 0],
    rArmour: n => [1000 * 2 ** (n - 1), 0, 0],
  };

  const storageCap = n => 5000 * Math.floor(2.5 * Math.exp(20 * n / 33));
  const mineBase = { metal: n => 30 * n * 1.1 ** n, crystal: n => 20 * n * 1.1 ** n, deut: (n, t) => 10 * n * 1.1 ** n * (1.44 - 0.004 * t) };
  const mineEnergy = { metal: n => 10 * n * 1.1 ** n, crystal: n => 10 * n * 1.1 ** n, deut: n => 20 * n * 1.1 ** n };

  function planetCalc(p, R, S) {
    const b = p.b; const t = b.tempMax != null ? b.tempMax : POS_TEMP[p.pos] ?? 50;
    const sp = S.speed;
    const collector = S.collector ? 0.25 : 0; const geo = (S.geologist ? 0.10 : 0) + (S.allyTrader ? 0.05 : 0) + (S.extraPct || 0) / 100;
    const plasma = R.rPlasma || 0;
    const lfProd = Object.entries(p.lfr || {}).reduce((a, [k, v]) => a + ((LFR[k] && LFR[k].eff) || 0) * v, 0);
    const crawlerBonus = Math.min((b.crawlers || 0) * (S.collector ? 0.0003 : 0.0002), 0.5);
    const bonM = 1 + (METAL_POS[p.pos] || 0) + collector + geo + plasma * 0.01 + (b.lfHES || 0) * 0.015 + (b.rtMagma || 0) * 0.02 + crawlerBonus + lfProd;
    const bonC = 1 + (CRYS_POS[p.pos] || 0) + collector + geo + plasma * 0.0066 + (b.lfFPP || 0) * 0.015 + (b.rtRefinery || 0) * 0.02 + crawlerBonus + lfProd;
    const bonD = 1 + collector + geo + plasma * 0.0033 + (b.lfFPP || 0) * 0.01 + (b.rtDeutSynth || 0) * 0.02 + crawlerBonus + lfProd;
    const eTech = R.rEnergy || 0;
    const plantBonus = 1 + (S.collector ? 0.10 : 0) + (S.engineer ? 0.10 : 0);
    const solarE = l => 20 * l * 1.1 ** l;
    const fusionE = l => 30 * l * (1.05 + 0.01 * eTech) ** l;
    const satE = Math.max(1, Math.floor(t / 4 + 20));
    const eProd = (solarE(b.solar || 0) + fusionE(b.fusion || 0)) * plantBonus + (b.sats || 0) * satE;
    const crawlerE = (b.crawlers || 0) * 50;
    const eUse = mineEnergy.metal(b.metal || 0) + mineEnergy.crystal(b.crystal || 0) + mineEnergy.deut(b.deut || 0) + crawlerE;
    const factor = eUse > 0 ? Math.min(1, eProd / eUse) : 1;
    const fusionDeut = 10 * (b.fusion || 0) * 1.1 ** (b.fusion || 0) * sp;
    const prod = {
      m: (30 + mineBase.metal(b.metal || 0) * factor * bonM) * sp,
      c: (15 + mineBase.crystal(b.crystal || 0) * factor * bonC) * sp,
      d: (mineBase.deut(b.deut || 0, t) * factor * bonD) * sp - fusionDeut,
    };
    const cap = { m: storageCap(b.stM || 0), c: storageCap(b.stC || 0), d: storageCap(b.stD || 0) };
    const fill = { m: cap.m / Math.max(prod.m, 1), c: cap.c / Math.max(prod.c, 1), d: prod.d > 0 ? cap.d / prod.d : Infinity };
    // calibrate on the game's real numbers when the export has them
    const st = p.stock || {}; const calib = {};
    const realProd = r => st['prod' + r] != null ? st['prod' + r] : (st['prodps' + r] != null ? st['prodps' + r] * 3600 : null);
    let bm = bonM, bc = bonC, bd = bonD;
    if (!S.noCalib) {
      const rm = realProd('m'), rc = realProd('c'), rd = realProd('d');
      const mm = mineBase.metal(b.metal || 0) * factor * bonM * sp, mc = mineBase.crystal(b.crystal || 0) * factor * bonC * sp, md = mineBase.deut(b.deut || 0, t) * factor * bonD * sp;
      const fit = (real, base, model) => { if (real == null || model <= 0) return null; const u = (real - base) / model; return u > 0.5 && u < 3 ? u : null; };
      const um = fit(rm, 30 * sp, mm), uc = fit(rc, 15 * sp, mc), ud = fit(rd != null ? rd + fusionDeut : null, 0, md);
      if (um) { bm = bonM * um; prod.m = rm; calib.m = um; }
      if (uc) { bc = bonC * uc; prod.c = rc; calib.c = uc; }
      if (ud) { bd = bonD * ud; prod.d = rd; calib.d = ud; }
    }
    if (p.calibFixed) { // used by the plan simulation: keep the calibration found on the real planet
      const cf = p.calibFixed;
      if (cf.m) { bm = bonM * cf.m; prod.m = (30 + mineBase.metal(b.metal || 0) * factor * bm) * sp; calib.m = cf.m; }
      if (cf.c) { bc = bonC * cf.c; prod.c = (15 + mineBase.crystal(b.crystal || 0) * factor * bc) * sp; calib.c = cf.c; }
      if (cf.d) { bd = bonD * cf.d; prod.d = mineBase.deut(b.deut || 0, t) * factor * bd * sp - fusionDeut; calib.d = cf.d; }
    }
    const capRatio = p.capRatio || {};
    for (const r of ['m', 'c', 'd']) { if (st['cap' + r]) { capRatio[r] = st['cap' + r] / cap[r]; cap[r] = st['cap' + r]; } else if (p.capRatio && p.capRatio[r]) cap[r] = Math.round(cap[r] * p.capRatio[r]); }
    const fill2 = { m: cap.m / Math.max(prod.m, 1), c: cap.c / Math.max(prod.c, 1), d: prod.d > 0 ? cap.d / prod.d : Infinity };
    return { lfProd, t, bonM: bm, bonC: bc, bonD: bd, eProd, eUse, factor, prod, cap, fill: fill2, satE, solarE, plantBonus, fusionDeut, calib, capRatio, modelBon: { m: bonM, c: bonC, d: bonD } };
  }

  const fmt = n => { const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace('.', ',') + ' M'; if (a >= 1e3) return Math.round(n / 1e3) + 'k'; return Math.round(n).toString(); };
  const fmtCost = c => [c[0] ? fmt(c[0]) + ' M' : null, c[1] ? fmt(c[1]) + ' C' : null, c[2] ? fmt(c[2]) + ' D' : null].filter(Boolean).join(' · ');
  const fmtH = h => !isFinite(h) ? '∞' : h < 48 ? Math.round(h) + ' h' : (h / 24).toFixed(1).replace('.', ',') + ' j';



  // ---------- multi-day build plan (per planet, buildings queue) ----------
  // ---------- one rule set for the building queue: used by the plan AND by the Planètes tab ----------
  const QNAMES = { metal: 'Mine de métal', crystal: 'Mine de cristal', deut: 'Synthétiseur de deutérium', solar: 'Centrale solaire', fusion: 'Centrale de fusion', stM: 'Hangar de métal', stC: 'Hangar de cristal', stD: 'Réservoir de deutérium', robots: 'Usine de robots', shipyard: 'Chantier spatial', nanite: 'Usine de nanites' };
  const SAT_N = 10;
  // returns the next build for planet p (state c, stock) and why, in priority order
  function pickNext(p, c, stock, R, S) {
    const msu = x => x[0] + x[1] * S.ratioC + x[2] * S.ratioD; const b = p.b; const K = ['m', 'c', 'd'];
    const eSurplus = c.eProd - c.eUse; const eTech = R.rEnergy || 0; const fl = b.fusion || 0;
    const solarGain = (c.solarE((b.solar || 0) + 1) - c.solarE(b.solar || 0)) * c.plantBonus;
    const fusE = l => 30 * l * (1.05 + 0.01 * eTech) ** l;
    const fusGain = (fusE(fl + 1) - fusE(fl)) * c.plantBonus; const fusBurn = (10 * (fl + 1) * 1.1 ** (fl + 1) - 10 * fl * 1.1 ** fl) * S.speed;
    const eOpts = [{ key: 'solar', price: msu(cost.solar((b.solar || 0) + 1)) / solarGain }];
    if (eTech >= 3 && (b.deut || 0) >= 5) eOpts.push({ key: 'fusion', price: (msu(cost.fusion(fl + 1)) + fusBurn * S.ratioD * 720) / fusGain });
    if ((b.shipyard || 0) >= 1) eOpts.push({ key: 'sats', price: msu([0, 2000, 500]) / c.satE });
    eOpts.sort((x, y) => x.price - y.price); const ePrice = eOpts[0].price;
    // live fill time of each storage
    const fillLeft = {}; K.forEach(r => { const s = stock[r] || 0; fillLeft[r] = s >= c.cap[r] ? 0 : c.prod[r] > 0 ? (c.cap[r] - s) / c.prod[r] : Infinity; });
    const ST = { m: 'stM', c: 'stC', d: 'stD' };
    // 1. energy deficit, 2. new colony: robots up to 4
    let base = null;
    if (c.factor < 0.999) base = { key: eOpts[0].key, why: 'energy' };
    else if ((b.robots || 0) < 4) base = { key: 'robots', why: 'robots' };
    // 4. best mine (energy for the next level counted in its price)
    const gainOf = k => { const l = b[k] || 0; const g0 = k === 'metal' ? (mineBase.metal(l + 1) - mineBase.metal(l)) * c.bonM : k === 'crystal' ? (mineBase.crystal(l + 1) - mineBase.crystal(l)) * c.bonC * S.ratioC : (mineBase.deut(l + 1, c.t) - mineBase.deut(l, c.t)) * c.bonD * S.ratioD; return g0 * S.speed; };
    const cands = ['metal', 'crystal', 'deut'].map(k => { const l = b[k] || 0; const cc = cost[k](l + 1); const dE = mineEnergy[k](l + 1) - mineEnergy[k](l); const short = Math.max(0, dE - Math.max(0, eSurplus)); return { k, cc, pay: (msu(cc) + short * ePrice) / gainOf(k) }; }).sort((x, y) => x.pay - y.pay);
    let pick = base || { key: cands[0].k, why: 'mine' };
    // 5. infrastructure goes first when it costs less than that mine
    const rob = b.robots || 0; const infra = [];
    if (rob >= 4 && rob < 10 && (b.metal || 0) >= 12) infra.push('robots');
    if ((b.shipyard || 0) < 2 && (b.metal || 0) >= 10) infra.push('shipyard');
    if (rob >= 10 && (R.rComp || 0) >= 10 && (b.nanite || 0) < 1) infra.push('nanite');
    const mineMsu = msu(cands[0].cc);
    if (!base) for (const k of infra) if (msu(cost[k]((b[k] || 0) + 1)) <= mineMsu) { pick = { key: k, why: 'infra' }; break; }
    const cc = pick.key === 'sats' ? [0, 2000 * SAT_N, 500 * SAT_N] : cost[pick.key]((b[pick.key] || 0) + 1);
    // 6. a build larger than the storage needs a bigger storage first
    for (const [j, r] of K.entries()) if (cc[j] > c.cap[r] * 0.98) return { key: ST[r], why: 'storage-size', for: pick.key };
    // 7. storage that would fill up before you can pay for that build (or before your next login)
    let waitH = 0; K.forEach((r, j) => { const miss = cc[j] - (stock[r] || 0); if (miss > 0) waitH = Math.max(waitH, c.prod[r] > 0 ? miss / c.prod[r] : Infinity); });
    // a resource the build does not use keeps piling up: only your next login empties it
    for (const [j, r] of K.entries()) { const lim = cc[j] > 0 ? Math.min(waitH, S.fillHours) : S.fillHours; if (fillLeft[r] < lim) return { key: ST[r], why: 'storage', fillLeft: fillLeft[r], waitH }; }
    return pick;
  }

  function simulatePlan(p0, R, S, startStock, hours) {
    const c0 = planetCalc(p0, R, S);
    const p = { name: p0.name, pos: p0.pos, coords: p0.coords, temp: p0.temp, b: Object.assign({}, p0.b), lfr: p0.lfr, calibFixed: c0.calib, capRatio: c0.capRatio };
    let stock = { m: startStock.m || 0, c: startStock.c || 0, d: startStock.d || 0 };
    const K = ['m', 'c', 'd']; const steps = []; let t = 0; let guard = 0;
    const buildH = (cst, b) => (cst[0] + cst[1]) / (2500 * (1 + (b.robots || 0)) * Math.pow(2, b.nanite || 0) * S.speed);
    while (t < hours && guard++ < 200) {
      const c = planetCalc(p, R, S); const b = p.b;
      const pk = pickNext(p, c, stock, R, S); const key = pk.key;
      const isSat = key === 'sats'; const lvl = isSat ? (b.sats || 0) + SAT_N : (b[key] || 0) + 1;
      const cc = isSat ? [0, 2000 * SAT_N, 500 * SAT_N] : cost[key](lvl);
      const name = isSat ? `${SAT_N} satellites solaires` : `${QNAMES[key]} ${lvl}`;
      let wait = 0, blocked = false;
      K.forEach((r, j) => { const miss = cc[j] - stock[r]; if (miss > 0) { if (c.prod[r] <= 0 || cc[j] > c.cap[r]) blocked = true; else wait = Math.max(wait, miss / c.prod[r]); } });
      if (blocked) { steps.push({ t, name, key, why: pk.why, blocked: true }); break; }
      const grow = h => K.forEach(r => { stock[r] = Math.min(Math.max(stock[r], c.cap[r]), stock[r] + c.prod[r] * h); if (stock[r] < 0) stock[r] = 0; });
      grow(wait); const start = t + wait; if (start > hours) break;
      K.forEach((r, j) => { stock[r] -= cc[j]; });
      const bt = isSat ? 0 : buildH(cc, b); grow(bt); // satellites use the shipyard, not the building queue
      steps.push({ start, end: start + bt, key, why: pk.why, name, cost: cc });
      if (isSat) b.sats = lvl; else p.b[key] = lvl; t = start + bt;
    }
    const before = c0, after = planetCalc(p, R, S);
    return { steps, before: before.prod, after: after.prod, levels: p.b };
  }

  // ---------- transports between planets ----------
  function flight(a, b, shipSpeed, fleetSpeed) {
    let d;
    if (a.gal !== b.gal) d = 20000 * Math.abs(a.gal - b.gal);
    else if (a.sys !== b.sys) d = 2700 + 95 * Math.abs(a.sys - b.sys);
    else if (a.pos !== b.pos) d = 1000 + 5 * Math.abs(a.pos - b.pos);
    else d = 5;
    const sec = (10 + 3500 * Math.sqrt(10 * d / shipSpeed)) / fleetSpeed; // at 100 % speed; checked in game: 3840 u, 21112, x4 = 19:43
    return { d, h: sec / 3600 };
  }
  function planTransports(out, R, S) {
    const P = out.planets; const cm = 1 + 0.05 * (R.rHyper || 0) + (S.collector ? 0.25 : 0); // bonuses add up (checked in game: hyper 4 + collector = 36 250 per GT)
    const capLC = 25000 * cm, capSC = 5000 * cm;
    const speedLC = 7500 * (1 + 0.1 * (R.rComb || 0) + (S.collector ? 1 : 0));
    const fleetSpeed = (out.server && out.server.speedPeace) || S.fleetSpeed || 1;
    const K = ['m', 'c', 'd'];
    // what each planet can give: stock minus what its own next build needs
    const avail = P.map(x => {
      if (!x.c.stockNow) return null;
      const top = x.recs.find(r => r.cost); const res = top ? top.cost : [0, 0, 0];
      return K.map((k, j) => Math.max(0, Math.floor((x.c.stockNow[k] || 0) - res[j])));
    });
    const ships = P.map(x => ({ LC: x.p.b.sLC || 0, SC: x.p.b.sSC || 0 }));
    const plans = [];
    P.forEach((x, ti) => {
      const r = x.recs[0];
      if (!r || !r.cost || r.affordable !== false || !r.missing) return;
      if (r.waitBlock === 'hangar') return;
      let need = r.missing.map(v => Math.ceil(v)); const legs = [];
      const sources = P.map((s, si) => ({ s, si, f: flight(s.p, x.p, speedLC, fleetSpeed) }))
        .filter(o => o.si !== ti && avail[o.si])
        .sort((a, b) => ((ships[b.si].LC + ships[b.si].SC > 0) - (ships[a.si].LC + ships[a.si].SC > 0)) || a.f.h - b.f.h);
      for (const o of sources) {
        if (need.every(v => v <= 0)) break;
        const give = need.map((v, j) => Math.min(Math.max(0, v), avail[o.si][j]));
        const tot = give.reduce((a, b) => a + b, 0); if (tot <= 0) continue;
        let lc = Math.min(ships[o.si].LC, Math.ceil(tot / capLC)); let rest = tot - lc * capLC;
        let sc = rest > 0 ? Math.min(ships[o.si].SC, Math.ceil(rest / capSC)) : 0; rest -= sc * capSC;
        let carry = give.slice();
        const shortShips = rest > 0 ? Math.ceil(rest / capLC) : 0;
        if (rest > 0) { // not enough transporters: scale the load down
          const ratio = Math.max(0, (tot - rest) / tot); carry = give.map(v => Math.floor(v * ratio));
        }
        const fuel = Math.round(1 + (lc * 50 + sc * 10) * o.f.d / 35000 * 4);
        carry.forEach((v, j) => { need[j] -= v; avail[o.si][j] -= v; });
        if (lc) ships[o.si].LC -= lc; if (sc) ships[o.si].SC -= sc;
        legs.push({ from: o.s.p.name, carry, lc, sc, h: o.f.h, fuel, shortShips });
      }
      if (!legs.length) return;
      const covered = need.every(v => v <= 0);
      const arrive = Math.max(...legs.map(l => l.h));
      if (covered && isFinite(r.waitH) && arrive >= r.waitH) return; // waiting is as fast
      const plan = { to: x.p.name, build: r.title, legs, covered, arriveH: arrive, waitH: r.waitH, left: need.map(v => Math.max(0, v)) };
      plans.push(plan); r.transport = plan;
    });
    out.transports = plans;
  }

  function analyse(text, S) {
    const { planets, research: R, server, exportedAt, officers } = parse(text);
    if (server.speed) S = Object.assign({}, S, { speed: server.speed });
    if (officers) S = Object.assign({}, S, { geologist: officers.includes('geologist'), engineer: officers.includes('engineer') });
    const msu = c => c[0] + c[1] * S.ratioC + c[2] * S.ratioD; // metal standard units
    const out = { planets: [], research: [], warnings: [], R, server, speedUsed: S.speed, exportedAt, officers };
    const calcs = planets.map(p => planetCalc(p, R, S));
    // live stock: exported amount + production since the export, capped by storage
    const elapsedH = exportedAt ? Math.max(0, ((S.now || Date.now()) - exportedAt) / 3600000) : 0;
    planets.forEach((p, i) => { const c = calcs[i]; c.fillLeft = Object.assign({}, c.fill); c.full = {};
      if (!p.stock) return;
      c.stockNow = {}; c.stockAt = exportedAt;
      for (const r of ['m', 'c', 'd']) {
        const s0 = p.stock[r]; if (s0 == null) continue;
        const now = s0 >= c.cap[r] ? s0 : Math.min(c.cap[r], s0 + Math.max(0, c.prod[r]) * elapsedH);
        c.stockNow[r] = now; c.full[r] = now >= c.cap[r];
        c.fillLeft[r] = c.full[r] ? 0 : (c.prod[r] > 0 ? (c.cap[r] - now) / c.prod[r] : Infinity);
      }
    });

    // empire totals
    const tot = { m: 0, c: 0, d: 0 };
    calcs.forEach(c => { tot.m += c.prod.m; tot.c += c.prod.c; tot.d += c.prod.d; });
    out.totals = tot;

    // energy unit price: cost of next solar level per energy, averaged across planets (msu per energy)
    planets.forEach((p, i) => {
      const b = p.b; const c = calcs[i]; const recs = [];
      const sp = S.speed;
      const solarNext = (b.solar || 0) + 1;
      const solarGain = (c.solarE(solarNext) - c.solarE(b.solar || 0)) * c.plantBonus;
      const eSurplus = c.eProd - c.eUse;
      // energy options: solar, fusion (deut burn counted over 30 days), satellites
      const eTech = R.rEnergy || 0; const fl = b.fusion || 0;
      const fusE = l => 30 * l * (1.05 + 0.01 * eTech) ** l;
      const fusGain = (fusE(fl + 1) - fusE(fl)) * c.plantBonus;
      const fusBurn = (10 * (fl + 1) * 1.1 ** (fl + 1) - 10 * fl * 1.1 ** fl) * sp;
      const eOpts = [
        { title: `Centrale solaire ${solarNext}`, cost: cost.solar(solarNext), gain: solarGain, price: msu(cost.solar(solarNext)) / solarGain, note: '' },
      ];
      if ((R.rEnergy || 0) >= 3 && (b.deut || 0) >= 5) eOpts.push({ title: `Centrale de fusion ${fl + 1}`, cost: cost.fusion(fl + 1), gain: fusGain, price: (msu(cost.fusion(fl + 1)) + fusBurn * S.ratioD * 720) / fusGain, note: ` Elle brûle ${Math.round(fusBurn)} deut/h de plus.` });
      if ((b.shipyard || 0) >= 1) { const n = 10; eOpts.push({ title: `${n} satellites solaires`, cost: [0, 2000 * n, 500 * n], gain: c.satE * n, price: msu([0, 2000, 500]) / c.satE, note: ' Attention : les satellites sont détruits en cas d\'attaque.' }); }
      eOpts.sort((a, b2) => a.price - b2.price);
      const eBest = eOpts[0]; const ePrice = eBest.price;

      // candidate mine upgrades with ROI
      const cands = [];
      const mineGain = (k, lvl) => {
        if (k === 'metal') return (mineBase.metal(lvl + 1) - mineBase.metal(lvl)) * c.bonM * sp;
        if (k === 'crystal') return (mineBase.crystal(lvl + 1) - mineBase.crystal(lvl)) * c.bonC * sp * S.ratioC;
        return (mineBase.deut(lvl + 1, c.t) - mineBase.deut(lvl, c.t)) * c.bonD * sp * S.ratioD;
      };
      const NAMES = { metal: 'Mine de métal', crystal: 'Mine de cristal', deut: 'Synthétiseur de deutérium' };
      for (const k of ['metal', 'crystal', 'deut']) {
        const lvl = b[k] || 0; const cc = cost[k](lvl + 1);
        const dE = mineEnergy[k](lvl + 1) - mineEnergy[k](lvl);
        const eShort = Math.max(0, dE - Math.max(0, eSurplus));
        const total = msu(cc) + eShort * ePrice;
        const gain = mineGain(k, lvl) * c.factor;
        cands.push({ key: k, name: `${NAMES[k]} ${lvl + 1}`, cost: cc, gain, payback: total / gain, needEnergy: eShort > 0, dE });
      }
      cands.sort((a, b2) => a.payback - b2.payback);

      // 1. energy
      const eAlt = eOpts.slice(1).map(o => `${o.title} : ${Math.round(o.price)} unités/énergie`);
      if (c.factor < 0.999) recs.push({ prio: 1, type: 'urgent', title: eBest.title, cost: eBest.cost, why: `Énergie insuffisante : tes mines tournent à ${Math.round(c.factor * 100)} %. C'est la source d'énergie la moins chère ici (+${Math.round(eBest.gain)}).${eBest.note}`, alt: eAlt });

      // 2. storage
      const ST = { m: ['stM', 'Hangar de métal'], c: ['stC', 'Hangar de cristal'], d: ['stD', 'Réservoir de deutérium'] };
      for (const r of ['m', 'c', 'd']) {
        const left = c.fillLeft[r];
        if (left < S.fillHours) {
          const [key, nm] = ST[r]; const lvl = (b[key] || 0) + 1; const RN = { m: 'métal', c: 'cristal', d: 'deutérium' }[r];
          const why = c.full[r] ? `Déjà plein (${fmt(c.cap[r])}) : la production de ${RN} est arrêtée sur cette planète. Dépense ce stock ou monte le hangar tout de suite.`
            : `${c.stockNow ? 'Plein dans' : 'Plein en'} ${fmtH(left)} (capacité ${fmt(c.cap[r])}). Si tu ne te connectes pas avant, la production s'arrête.`;
          recs.push({ prio: left < S.fillHours / 2 ? 1 : 2, type: left < S.fillHours / 2 ? 'urgent' : 'important', title: `${nm} ${lvl}`, cost: cost[key](lvl), why: why + ` Le niveau ${lvl} porte la capacité à ${fmt(storageCap(lvl))}.` });
        }
      }

      // 3. best mine
      const best = cands[0];
      recs.push({ prio: 3, type: 'eco', title: best.name, cost: best.cost, why: `Meilleure rentabilité de la planète : +${fmt(best.gain / (best.key === 'metal' ? 1 : best.key === 'crystal' ? S.ratioC : S.ratioD))}/h, amorti en ${fmtH(best.payback)}${best.needEnergy ? ' (énergie du niveau suivant de centrale incluse : prévois de l\'énergie juste après)' : ''}.`, alt: cands.slice(1).map(x => `${x.name} : amorti en ${fmtH(x.payback)}`) });
      if (best.needEnergy && c.factor >= 0.999) recs.push({ prio: 3, type: 'eco', title: eBest.title, cost: eBest.cost, why: `Il te reste ${Math.round(eSurplus)} d'énergie, ce qui ne suffit pas pour le prochain niveau de mine (+${Math.round(best.dE)}). C'est la source d'énergie la moins chère ici (+${Math.round(eBest.gain)}).${eBest.note}`, alt: eAlt });

      // new colony: robots first
      if ((b.robots || 0) < 4) recs.push({ prio: 2, type: 'infra', title: `Usine de robots ${(b.robots || 0) + 1}`, cost: cost.robots((b.robots || 0) + 1), why: 'Presque gratuit à ce niveau et chaque niveau accélère toutes les constructions de la colonie. À faire passer avant les mines.' });

      // 4. infrastructure
      const rob = b.robots || 0;
      if (rob >= 4 && rob < 10 && (b.metal || 0) >= 12) recs.push({ prio: 4, type: 'infra', title: `Usine de robots ${rob + 1}`, cost: cost.robots(rob + 1), why: rob < 2 ? 'Indispensable sur une nouvelle colonie : chaque niveau réduit les temps de construction de tous les bâtiments.' : 'Accélère toutes les constructions de la planète. Vise 10 pour débloquer ensuite l\'usine de nanites.' });
      if ((b.shipyard || 0) < 2 && (b.metal || 0) >= 10) recs.push({ prio: 4, type: 'infra', title: `Chantier spatial ${(b.shipyard || 0) + 1}`, cost: cost.shipyard((b.shipyard || 0) + 1), why: 'Pour construire quelques défenses et transporteurs sur place.' });
      if (rob >= 10 && (R.rComp || 0) >= 10 && (b.nanite || 0) < 1) recs.push({ prio: 4, type: 'infra', title: 'Usine de nanites 1', cost: cost.nanite(1), why: 'Divise par deux tous les temps de construction de la planète.' });

      // 5. lifeform
      const isRock = (b.rtEnclave || 0) > 0 || (b.rtFarm || 0) > 0;
      const rc = b.lfRC || 0; const hasLF = (b.lfRes || 0) > 0 || isRock;
      if (isRock) {
        const rt = b.rtRTech || 0;
        if (rt < 5) recs.push({ prio: 5, type: 'lf', title: `Rock'tal : Centre technologique runique ${rt + 1}`, cost: null, why: 'Ta population Rock\'tal est là, mais les bâtiments de production ne sont pas débloqués. Le Centre technologique runique (niveau 5 en général) ouvre la Fusion magmatique (+2 % de métal par niveau). Vérifie les prérequis exacts dans le jeu.' });
        else if ((b.rtMagma || 0) < 5) recs.push({ prio: 5, type: 'lf', title: `Rock'tal : Fusion magmatique ${(b.rtMagma || 0) + 1}`, cost: null, why: '+2 % de production de métal par niveau, sur une file de construction séparée. La Raffinerie de cristaux (+2 % cristal) et le Synthétiseur de deutérium Rock\'tal (+2 % deut) suivent.' });
        else recs.push({ prio: 5, type: 'lf', title: `Rock'tal : Raffinerie de cristaux ${(b.rtRefinery || 0) + 1}`, cost: null, why: '+2 % de production de cristal par niveau.' });
      }
      else if (!hasLF && (b.metal || 0) >= 10) recs.push({ prio: 5, type: 'lf', title: 'Formes de vie : Secteur résidentiel', cost: null, why: 'Aucun bâtiment de forme de vie ici. Monte le secteur résidentiel et la ferme biosphérique en parallèle (ils ont leur propre file de construction).' });
      else if (hasLF && rc < 5 && (b.lfRes || 0) >= 12) recs.push({ prio: 5, type: 'lf', title: `Formes de vie : Centre de recherche ${rc + 1}`, cost: null, why: 'Ta population est là, mais les bâtiments de production ne sont pas débloqués. Le centre de recherche (niveau 5 en général) ouvre Fusion à haute énergie (+1,5 % métal par niveau). Vérifie les prérequis exacts dans le jeu.' });
      else if (hasLF && rc >= 5 && (b.lfHES || 0) < 10) recs.push({ prio: 5, type: 'lf', title: `Formes de vie : Fusion à haute énergie ${(b.lfHES || 0) + 1}`, cost: null, why: '+1,5 % de production de métal par niveau, sur une file de construction séparée.' });

      // 5b. lifeform research
      const lfr = p.lfr || {}; const lfKeys = Object.keys(lfr);
      const races = new Set(lfKeys.filter(k => LFR[k]).map(k => LFR[k].race));
      const unknown = lfKeys.filter(k => !LFR[k] && lfr[k] > 0);
      if (races.has("Rock'tal") && hasLF && !isRock) recs.push({ prio: 5, type: 'lf', title: 'Formes de vie : vérifie l\'espèce de la planète', cost: null, why: `Tes recherches ici sont Rock'tal (Batteries volcaniques), mais tes bâtiments portent les noms humains. Si la planète est Rock'tal, ses bâtiments s'appellent autrement : envoie-moi leurs vrais noms pour que je les prenne en compte.` });
      if (unknown.length) recs.push({ prio: 6, type: 'lf', title: 'Recherches de forme de vie non reconnues', cost: null, why: `Je ne connais pas encore l'effet de : ${unknown.join(', ')}. Elles ne sont pas comptées dans la production.` });
      if (hasLF && lfKeys.length && !lfKeys.some(k => lfr[k] > 0)) recs.push({ prio: 5, type: 'lf', title: 'Formes de vie : lance une première recherche', cost: null, why: 'Tu as de la population mais aucune recherche de forme de vie. Les recherches tournent en parallèle de la recherche classique.' });
      const hpeKey = 'extracteurs a haute performance';
      if (lfr[hpeKey] != null && c.lfProd > 0) recs.push({ prio: 6, type: 'lf', title: `Extracteurs à haute performance (niv. ${lfr[hpeKey]})`, cost: null, why: `Compté dans la production : +${(c.lfProd * 100).toFixed(2).replace('.', ',')} % sur les trois ressources. C'est un petit bonus par niveau, à monter quand le reste est fait.` });

      // 6. defense sanity
      const defPts = (b.dRL || 0) * 2 + (b.dLL || 0) * 2 + (b.dHL || 0) * 8 + (b.dGauss || 0) * 37 + (b.dIon || 0) * 8 + (b.dPlasma || 0) * 130;
      if (defPts === 0 && (b.metal || 0) >= 10) recs.push({ prio: 5, type: 'def', title: 'Défense de base', cost: null, why: 'Aucune défense : la planète est une cible facile pour les petits raideurs. Quelques lanceurs de missiles et lasers légers suffisent à les décourager (chantier spatial requis).' });

      recs.sort((a, b2) => a.prio - b2.prio);
      if (c.stockNow) recs.forEach(r => { if (!r.cost) return; const miss = ['m', 'c', 'd'].map((k, j) => Math.max(0, r.cost[j] - (c.stockNow[k] ?? Infinity))); r.missing = miss; r.affordable = miss.every(v => v <= 0);
        if (!r.affordable) { const P3 = [c.prod.m, c.prod.c, c.prod.d], K3 = ['m', 'c', 'd'];
          let w = 0, block = null;
          miss.forEach((v, j) => { if (v <= 0) return; if (r.cost[j] > c.cap[K3[j]]) block = 'hangar'; else if (P3[j] <= 0) block = 'prod'; else w = Math.max(w, v / P3[j]); });
          r.waitH = block ? Infinity : w; r.waitBlock = block; } });
      out.planets.push({ p, c, recs, cands, eSurplus });
    });

    // empire-wide lifeform notes
    const envoys = planets.filter(p => (p.lfr || {})['ambassadeurs intergalactiques'] > 0);
    const envoysOver = envoys.filter(p => p.lfr['ambassadeurs intergalactiques'] > 1);
    if (envoys.length > 1 || envoysOver.length) out.warnings.push(`Ambassadeurs intergalactiques : le niveau 1 sur une seule planète suffit pour les missions de découverte, et les niveaux suivants n'augmentent pas les chances. Tu les as sur ${envoys.length} planète(s)${envoysOver.length ? `, dont au niveau ${envoysOver.map(p => p.lfr['ambassadeurs intergalactiques']).join('/')} sur ${envoysOver.map(p => p.name).join(', ')}` : ''}. N'y mets plus de ressources.`);

    // research
    const Rr = k => R[k] || 0;
    const sumBase = { m: 0, c: 0, d: 0 };
    planets.forEach((p, i) => { const c = calcs[i]; sumBase.m += mineBase.metal(p.b.metal || 0) * c.factor * S.speed; sumBase.c += mineBase.crystal(p.b.crystal || 0) * c.factor * S.speed; sumBase.d += mineBase.deut(p.b.deut || 0, c.t) * c.factor * S.speed; });
    const pl = Rr('rPlasma') + 1; const plCost = cost.rPlasma(pl);
    const plGain = sumBase.m * 0.01 + sumBase.c * 0.0066 * S.ratioC + sumBase.d * 0.0033 * S.ratioD;
    out.research.push({ title: `Technologie plasma ${pl}`, cost: plCost, payback: msu(plCost) / plGain, why: `+${fmt(sumBase.m * 0.01)} métal, +${fmt(sumBase.c * 0.0066)} cristal, +${fmt(sumBase.d * 0.0033)} deut par heure sur tout l'empire. Amorti en ${fmtH(msu(plCost) / plGain)}.` });

    const ast = Rr('rAstro'); const maxPl = 1 + Math.ceil(ast / 2);
    const nextOdd = ast % 2 === 0 ? ast + 1 : ast + 2;
    const astroCost = [0, 0, 0]; for (let l = ast + 1; l <= nextOdd; l++) cost.rAstro(l).forEach((v, j) => astroCost[j] += v);
    out.research.push({ title: `Astrophysique ${nextOdd}${nextOdd - ast > 1 ? ` (${ast + 1} puis ${nextOdd})` : ''}`, cost: astroCost, payback: null, why: `Débloque la planète n°${maxPl + 1} (tu en as ${planets.length}/${maxPl}). Une nouvelle colonie, c'est une nouvelle file de construction et ${fmt(tot.m / planets.length)} de métal/h à terme.` });

    const comp = Rr('rComp') + 1;
    out.research.push({ title: `Technologie ordinateur ${comp}`, cost: cost.rComp(comp), payback: null, why: `+1 slot de flotte (${comp + 1} au total) pour raids, expéditions et fleet-save.${comp === 10 ? ' Le niveau 10 débloque aussi l\'usine de nanites.' : ''}` });

    const maxLab = Math.max(0, ...planets.map(p => p.b.lab || 0));
    if (Rr('rIRN') === 0) {
      if (maxLab >= 10 && Rr('rComp') >= 8 && Rr('rHyper') >= 3) out.research.push({ title: 'Réseau de recherche intergalactique 1', cost: cost.rIRN(1), payback: null, why: 'Relie un 2e laboratoire à ton labo principal : toutes tes recherches vont plus vite.' });
      else { const labP = planets.find(p => (p.b.lab || 0) === maxLab); out.research.push({ title: `Prérequis du Réseau de recherche : laboratoire 10`, cost: cost.lab(maxLab + 1), payback: null, why: `Ton meilleur laboratoire est niveau ${maxLab}${labP ? ` (${labP.name})` : ''}. Il faut le niveau 10 pour le Réseau de recherche intergalactique, qui accélère toutes les recherches. Coût affiché : laboratoire ${maxLab + 1}.`, isBuilding: true }); }
    }
    if (Rr('rEnergy') < 12) out.research.push({ title: `Technologie énergétique ${Rr('rEnergy') + 1}`, cost: cost.rEnergy(Rr('rEnergy') + 1), payback: null, why: 'Améliore tes centrales à fusion et reste un prérequis de nombreuses technologies.' });

    // plasma vs mines: deprioritise plasma when mines pay back much faster
    const bestMine = Math.min(...out.planets.map(x => x.cands[0].payback));
    const plIdx = out.research.findIndex(r => r.title.startsWith('Technologie plasma'));
    if (plIdx >= 0 && out.research[plIdx].payback > 3 * bestMine) {
      const pr = out.research.splice(plIdx, 1)[0];
      pr.why += ` Tes mines s'amortissent en ${fmtH(bestMine)} : investis d'abord dans les mines, la plasma deviendra rentable plus tard.`;
      out.research.push(pr);
    }
    const H = (S.planDays || 3) * 24;
    out.plan = planets.map((p, i) => ({ planet: p, hasStock: !!calcs[i].stockNow, ...simulatePlan(p, R, S, calcs[i].stockNow || {}, H) }));
    // the Planètes tab shows the same building order as the plan: first steps of the plan, with the explanations of the matching recommendations
    const WHY = { mine: 'Meilleure rentabilité de la planète après les étapes précédentes.', storage: 'Le hangar sera plein avant que tu aies de quoi lancer la suite : monte-le pour ne pas perdre de production.', 'storage-size': 'La construction suivante coûte plus que ce que le hangar peut contenir.', energy: 'La construction précédente consomme plus d\'énergie que tu n\'en produis.', robots: 'Presque gratuit à ce niveau et accélère toutes les constructions de la colonie.', infra: 'Coûte moins que la prochaine mine et accélère toutes les constructions suivantes.' };
    out.planets.forEach((x, i) => {
      const steps = out.plan[i].steps; const old = x.recs; const used = new Set(); const q = [];
      steps.slice(0, 3).forEach((s, si) => {
        const m = old.find(r => r.title === s.name && !used.has(r)); if (m) used.add(m);
        const r = m ? Object.assign({}, m) : { prio: 3, type: s.why === 'infra' || s.why === 'robots' ? 'infra' : 'eco', title: s.name, cost: s.cost || null, why: WHY[s.why] || '' };
        if (!r.cost && s.cost) r.cost = s.cost;
        if (si === 0 && !m && s.why === 'storage-size') r.type = 'important';
        if (s.blocked) { r.affordable = false; r.waitH = Infinity; r.waitBlock = 'prod'; r.missing = r.missing || [0, 0, 0]; }
        else if (si > 0) { r.planStart = s.start; r.affordable = s.start <= 0.001; r.missing = r.missing || [0, 0, 0]; r.waitH = s.start; r.waitBlock = null; r.why = (r.why ? r.why + ' ' : '') + 'Étape ' + (si + 1) + ' du plan.'; }
        else if (calcs[i].stockNow) { const c = calcs[i]; const miss = ['m', 'c', 'd'].map((k, j) => Math.max(0, r.cost[j] - (c.stockNow[k] ?? Infinity))); r.missing = miss; r.affordable = miss.every(v => v <= 0); if (!r.affordable) { r.waitH = s.start; r.waitBlock = null; } }
        q.push(r);
      });
      // other queues (lifeform, defence) and building advice that is not part of the plan stay after
      const others = old.filter(r => !used.has(r) && !r.cost);
      const restBuild = q.length ? [] : old.filter(r => !used.has(r) && r.cost);
      x.recs = [...q, ...restBuild, ...others];
      x.parallel = others;
    });
    planTransports(out, R, S);
    // warnings
    if (tot.d < tot.m * 0.15) out.warnings.push(`Le deutérium est ton goulot d'étranglement (${fmt(tot.d)}/h contre ${fmt(tot.m)} métal/h). Monte les synthétiseurs et échange ton surplus au Marchand.`);
    return out;
  }

  return { parse, analyse, fmt, fmtCost, fmtH, planetCalc, storageCap, cost, flight };
})();
if (typeof module !== 'undefined') module.exports = OG;
