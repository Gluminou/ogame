// OGame combat simulator: units, spy report parser, Monte Carlo battle engine.
const CB = (() => {
  // id: [name FR, metal, crystal, deut, shield, attack, cargo, isDefense, aliases]
  const U = {
    LF: ['Chasseur léger', 3000, 1000, 0, 10, 50, 50, 0, ['chasseur leger']],
    HF: ['Chasseur lourd', 6000, 4000, 0, 25, 150, 100, 0, ['chasseur lourd', 'chasseeur lourd']],
    Cr: ['Croiseur', 20000, 7000, 2000, 50, 400, 800, 0, ['croiseur']],
    BS: ['Vaisseau de bataille', 45000, 15000, 0, 200, 1000, 1500, 0, ['vaisseau de bataille']],
    BC: ['Traqueur', 30000, 40000, 15000, 400, 700, 750, 0, ['traqueur']],
    Bo: ['Bombardier', 50000, 25000, 15000, 500, 1000, 500, 0, ['bombardier']],
    De: ['Destructeur', 60000, 50000, 15000, 500, 2000, 2000, 0, ['destructeur']],
    RIP: ['Étoile de la mort', 5000000, 4000000, 1000000, 50000, 200000, 1000000, 0, ['etoile de la mort']],
    Re: ['Faucheur', 85000, 55000, 20000, 700, 2800, 10000, 0, ['faucheur']],
    PF: ['Éclaireur', 8000, 15000, 8000, 100, 200, 10000, 0, ['eclaireur']],
    SC: ['Petit transporteur', 2000, 2000, 0, 10, 5, 5000, 0, ['petit transporteur']],
    LC: ['Grand transporteur', 6000, 6000, 0, 25, 5, 25000, 0, ['grand transporteur']],
    Col: ['Vaisseau de colonisation', 10000, 20000, 10000, 100, 50, 7500, 0, ['vaisseau de colonisation']],
    Rec: ['Recycleur', 10000, 6000, 2000, 10, 1, 20000, 0, ['recycleur']],
    EP: ['Sonde d\'espionnage', 0, 1000, 0, 0.01, 0.01, 0, 0, ['sonde d espionnage', 'sonde d espionage']],
    Sat: ['Satellite solaire', 0, 2000, 500, 1, 1, 0, 0, ['satellite solaire']],
    Cw: ['Foreuse', 2000, 2000, 1000, 1, 1, 0, 0, ['foreuse']],
    RL: ['Lanceur de missiles', 2000, 0, 0, 20, 80, 0, 1, ['lanceur de missiles']],
    LL: ['Artillerie laser légère', 1500, 500, 0, 25, 100, 0, 1, ['artillerie laser legere']],
    HL: ['Artillerie laser lourde', 6000, 2000, 0, 100, 250, 0, 1, ['artillerie laser lourde']],
    GC: ['Canon de Gauss', 20000, 15000, 2000, 200, 1100, 0, 1, ['canon de gauss']],
    IC: ['Artillerie à ions', 5000, 3000, 0, 500, 150, 0, 1, ['artillerie a ions']],
    PT: ['Lanceur de plasma', 50000, 50000, 30000, 300, 3000, 0, 1, ['lanceur de plasma']],
    SS: ['Petit bouclier', 10000, 10000, 0, 2000, 1, 0, 1, ['petit bouclier']],
    LS: ['Grand bouclier', 50000, 50000, 0, 10000, 1, 0, 1, ['grand bouclier']],
  };
  const SHIPS = ['LF', 'HF', 'Cr', 'BS', 'BC', 'Bo', 'De', 'RIP', 'Re', 'PF', 'SC', 'LC', 'Col', 'Rec', 'EP', 'Sat', 'Cw'];
  const ATTACK_SHIPS = SHIPS.filter(k => !['Sat', 'Cw'].includes(k));
  const DEFS = ['RL', 'LL', 'HL', 'GC', 'IC', 'PT', 'SS', 'LS'];
  const base5 = { EP: 5, Sat: 5, Cw: 5 };
  const RF = {
    LF: { ...base5 }, HF: { ...base5, SC: 3 }, Cr: { ...base5, LF: 6, RL: 10 }, BS: { ...base5, PF: 5 },
    BC: { ...base5, SC: 3, LC: 3, HF: 4, Cr: 4, BS: 7 }, Bo: { ...base5, RL: 20, LL: 20, HL: 10, IC: 10, GC: 5, PT: 5 },
    De: { ...base5, BC: 2, LL: 10 }, Re: { ...base5, BS: 7, Bo: 4, De: 3 }, PF: { ...base5, Cr: 3, LF: 3, HF: 2 },
    SC: { ...base5 }, LC: { ...base5 }, Col: { ...base5 }, Rec: { ...base5 },
    RIP: { SC: 250, LC: 250, LF: 200, HF: 100, Cr: 33, BS: 30, BC: 15, Bo: 25, De: 5, Col: 250, Rec: 250, EP: 1250, Sat: 1250, Cw: 1250, RL: 200, LL: 200, HL: 100, GC: 50, IC: 100, Re: 10, PF: 30 },
  };

  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`']/g, ' ').replace(/[^a-z0-9.,\s:]+/g, ' ').replace(/[ \t]+/g, ' ');
  const num = s => {
    if (!s) return 0; let t = s.trim().toLowerCase().replace(/\s/g, ''); let mult = 1;
    if (/(mrd|bn|b)$/.test(t)) { mult = 1e9; t = t.replace(/(mrd|bn|b)$/, ''); }
    else if (t.endsWith('m')) { mult = 1e6; t = t.slice(0, -1); } else if (t.endsWith('k')) { mult = 1e3; t = t.slice(0, -1); }
    if (mult > 1) return Math.round(parseFloat(t.replace(',', '.')) * mult) || 0;
    return parseInt(t.replace(/[.,]/g, ''), 10) || 0;
  };
  const NUM = '([0-9][0-9.,]*\\s*(?:mrd|m|k)?)(?![a-z])';

  // Parse a spy report (FR) or a "Nom: nombre" list
  function parseReport(text) {
    const t = norm(text);
    const out = { units: {}, tech: {}, res: {}, found: 0 };
    const grab = alias => { const re = new RegExp('(?:^|[^a-z])' + alias.replace(/ /g, '\\s+') + '\\s*:?\\s*' + NUM, 'g'); let m, v = null; while ((m = re.exec(t))) v = num(m[1]); return v; };
    for (const [k, u] of Object.entries(U)) for (const a of u[8]) { const v = grab(a); if (v != null) { out.units[k] = v; out.found++; break; } }
    const TECH = { esp: ['technologie espionnage', 'technologie d espionnage'], weap: ['technologie armes', 'technologie des armes'], shield: ['technologie bouclier', 'technologie des boucliers', 'technologie de bouclier'], armour: ['technologie protection des vaisseaux spatiaux', 'technologie de protection des vaisseaux spatiaux', 'protection des vaisseaux spatiaux'], hyper: ['technologie hyperespace'] };
    for (const [k, arr] of Object.entries(TECH)) for (const a of arr) { const v = grab(a); if (v != null) { out.tech[k] = v; out.found++; break; } }
    const RES = { m: '(?<!de\\s)metal', c: '(?<!de\\s)cristal', d: '(?<!de\\s)(?<!en\\s)deuterium' };
    // the debris field block repeats Métal / Cristal / Deutérium: read the planet's resources before it, the debris inside it
    const dfAt = t.search(/champ de debris/); const tRes = dfAt >= 0 ? t.slice(0, dfAt) : t;
    const tDf = dfAt >= 0 ? t.slice(dfAt).split(/\n\s*(?:flottes?|defense|batiments?|recherche)\s*\n/)[0] : '';
    const lastNum = (txt, a) => { const re = new RegExp('(?:^|[^a-z])' + a + '\\s*:?\\s*' + NUM, 'g'); let m, v = null; while ((m = re.exec(txt))) v = num(m[1]); return v; };
    for (const [k, a] of Object.entries(RES)) { const v = lastNum(tRes, a); if (v != null) { out.res[k] = v; out.found++; } }
    if (tDf) { out.df = {}; for (const [k, a] of Object.entries(RES)) { const v = lastNum(tDf, a); if (v != null) out.df[k] = v; } }
    const lm = t.match(/butin\s*:?\s*(\d{1,3})(?!\d)/); if (lm) out.lootPct = +lm[1];
    const cm = t.match(/classe\s*:\s*(le |la )?(collecteur|general|explorateur)/); if (cm) out.cls = cm[2];
    out.noResearch = /recherche\s+aucune donnee fiable/.test(t);
    const pm = text.match(/\[(\d+:\d+:\d+)\]/); if (pm) out.coords = pm[1];
    const dm = text.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/); if (dm) out.date = { y: +dm[3], mo: +dm[2], d: +dm[1], h: +dm[4], mi: +dm[5], s: +dm[6] };
    const nm = text.match(/(?:Planète|Lune)\s*\n?\s*([^\[\n]*?)\s*\[\d+:\d+:\d+\]/i); if (nm) out.planetName = nm[1].trim();
    out.isMoon = /de\s+Lune/i.test(text);
    // which sections the probes could read: 'shown', 'hidden' (espionage level too low) or 'missing'
    const L = text.split(/\r?\n/).map(l => /:/.test(l) ? '#' + norm(l) : norm(l).replace(/[.]+$/, '').trim()); // lines with ':' are summaries, not section headers
    const sec = {}; const HEAD = { fleet: ['flottes', 'flotte', 'vaisseaux'], def: ['defense', 'defenses'], build: ['batiment', 'batiments'], lfb: ['batiments des formes de vie'], research: ['recherche', 'recherches'], lfr: ['recherche des formes de vie'] };
    for (const [k, names] of Object.entries(HEAD)) {
      const i = L.findIndex(l => names.includes(l)); if (i < 0) { sec[k] = 'missing'; continue; }
      const next = L.slice(i + 1).find(l => l.length) || '';
      sec[k] = /aucune donnee fiable|niveau d.espionnage trop|trop faible/.test(next) ? 'hidden' : 'shown';
    }
    // sections are cumulative: a later one shown means the earlier ones were readable too
    const order = ['fleet', 'def', 'build', 'research'];
    for (let i = order.length - 1; i > 0; i--) if (sec[order[i]] === 'shown') for (let j = 0; j < i; j++) if (sec[order[j]] !== 'shown') sec[order[j]] = 'shown';
    out.sections = sec;
    out.fleetKnown = sec.fleet === 'shown'; out.defKnown = sec.def === 'shown';
    const sv = (re) => { const m = text.match(re); return m ? num(norm(m[1])) : null; };
    out.summary = { fleet: sv(/Flottes?\s*:\s*\n?\s*([0-9][0-9.,]*\s*[kKmM]?)/), def: sv(/D[ée]fenses?\s*:\s*\n?\s*([0-9][0-9.,]*\s*[kKmM]?)/) };
    const jm = text.match(/Joueur\s*:\s*([^\n]+)/i); if (jm) out.player = jm[1].trim();
    const am = t.match(/activite sur cette planete dans les (\d+) dernieres minutes/); if (am) out.activity = +am[1];
    return out;
  }

  // Build a side: {units:{k:n}, tech:{weap,shield,armour}}
  function buildSide(side) {
    const types = [], hullInit = [], hull = [], shieldMax = [], attack = [];
    const tw = 1 + 0.1 * (side.tech.weap || 0), ts = 1 + 0.1 * (side.tech.shield || 0), ta = 1 + 0.1 * (side.tech.armour || 0);
    const keys = Object.keys(side.units).filter(k => side.units[k] > 0 && U[k]);
    for (const k of keys) {
      const u = U[k]; const h = (u[1] + u[2]) / 10 * ta;
      for (let i = 0; i < side.units[k]; i++) { types.push(k); hullInit.push(h); hull.push(h); shieldMax.push(u[4] * ts); attack.push(u[5] * tw); }
    }
    return { types, hullInit, hull, shieldMax, attack, shield: shieldMax.slice() };
  }

  function fight(A, D, rnd) {
    const sides = [A, D];
    let rounds = 0;
    const alive = s => { const idx = []; for (let i = 0; i < s.hull.length; i++) if (s.hull[i] > 0) idx.push(i); return idx; };
    let aliveA = alive(A), aliveD = alive(D);
    for (let r = 0; r < 6; r++) {
      if (!aliveA.length || !aliveD.length) break;
      rounds++;
      for (const s of sides) for (const i of (s === A ? aliveA : aliveD)) s.shield[i] = s.shieldMax[i];
      const fire = (S, Sa, T, Ta) => {
        for (const i of Sa) {
          const myType = S.types[i]; const rf = RF[myType]; const dmg = S.attack[i];
          let again = true;
          while (again) {
            const j = Ta[(rnd() * Ta.length) | 0];
            if (T.hull[j] > 0 && dmg >= T.shieldMax[j] * 0.01) {
              let d = dmg;
              if (T.shield[j] >= d) { T.shield[j] -= d; d = 0; } else { d -= T.shield[j]; T.shield[j] = 0; }
              if (d > 0) {
                T.hull[j] -= d;
                if (T.hull[j] > 0 && T.hull[j] < 0.7 * T.hullInit[j] && rnd() < 1 - T.hull[j] / T.hullInit[j]) T.hull[j] = 0;
              }
            }
            const r2 = rf && rf[T.types[j]];
            again = !!r2 && rnd() < (r2 - 1) / r2;
          }
        }
      };
      fire(A, aliveA, D, aliveD);
      fire(D, aliveD, A, aliveA);
      aliveA = alive(A); aliveD = alive(D);
    }
    return { rounds, winner: !aliveD.length && aliveA.length ? 'A' : !aliveA.length && aliveD.length ? 'D' : !aliveA.length && !aliveD.length ? 'draw' : 'draw' };
  }

  function countAlive(s) { const c = {}; for (let i = 0; i < s.hull.length; i++) if (s.hull[i] > 0) c[s.types[i]] = (c[s.types[i]] || 0) + 1; return c; }

  function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // opts: {runs, lootPct, dfShips, dfDef, dfDeut, attackerCollector, hyperA}
  function simulate(att, def, opts) {
    const runs = opts.runs || 200; const rnd = opts.rnd || mulberry(12345);
    const stat = { A: 0, D: 0, draw: 0, rounds: 0, lossA: {}, lossD: {}, survA: {}, n: runs };
    for (let r = 0; r < runs; r++) {
      const A = buildSide(att), D = buildSide(def);
      const res = fight(A, D, rnd);
      stat[res.winner]++; stat.rounds += res.rounds;
      const ca = countAlive(A), cd = countAlive(D);
      for (const k in att.units) { const lost = (att.units[k] || 0) - (ca[k] || 0); stat.lossA[k] = (stat.lossA[k] || 0) + lost; stat.survA[k] = (stat.survA[k] || 0) + (ca[k] || 0); }
      for (const k in def.units) { const lost = (def.units[k] || 0) - (cd[k] || 0); stat.lossD[k] = (stat.lossD[k] || 0) + lost; }
    }
    for (const o of [stat.lossA, stat.lossD, stat.survA]) for (const k in o) o[k] /= runs;
    stat.rounds /= runs;
    const val = (loss, filter) => { const v = [0, 0, 0]; for (const k in loss) if (filter(k)) { v[0] += loss[k] * U[k][1]; v[1] += loss[k] * U[k][2]; v[2] += loss[k] * U[k][3]; } return v; };
    stat.costA = val(stat.lossA, () => true); stat.costD = val(stat.lossD, () => true);
    const shipsLost = [val(stat.lossA, k => !U[k][7]), val(stat.lossD, k => !U[k][7])];
    const defLost = val(stat.lossD, k => U[k][7]);
    const f = opts.dfShips ?? 0.3, fd = opts.dfDef ?? 0;
    stat.debris = [0, 1, 2].map(i => (i === 2 && !opts.dfDeut) ? 0 : (shipsLost[0][i] + shipsLost[1][i]) * f + defLost[i] * fd);
    const cargoMult = 1 + 0.05 * (opts.hyperA || 0);
    let cap = 0; for (const k in stat.survA) { let c = U[k][6] * (cargoMult + (opts.attackerCollector && (k === 'SC' || k === 'LC') ? 0.25 : 0)); cap += stat.survA[k] * c; }
    stat.cargo = cap;
    const res = def.res || {}; const lp = opts.lootPct ?? 0.5;
    const avail = [(res.m || 0) * lp, (res.c || 0) * lp, (res.d || 0) * lp];
    const winShare = stat.A / runs;
    // plunder: fill evenly, capped by capacity
    const loot = [0, 0, 0]; let left = cap; const want = avail.slice();
    for (let pass = 0; pass < 3 && left > 1; pass++) { const n = want.filter(x => x > 0).length; if (!n) break; const share = left / n; for (let i = 0; i < 3; i++) if (want[i] > 0) { const take = Math.min(want[i], share); loot[i] += take; want[i] -= take; left -= take; } }
    stat.lootIfWin = loot; stat.lootAvail = avail; stat.winShare = winShare;
    stat.lootExpected = loot.map(x => x * winShare);
    return stat;
  }


  // Smallest-cost fleet reaching minWin: start from everything available, remove ships while the cost
  // (expected losses + fuel, in metal units) does not go up. cfg: {minWin, fixed, cost(units)->extra, ratioC, ratioD, runs, maxEvals}
  function optimize(avail, tech, def, opts, cfg) {
    const combat = ['LF','HF','Cr','BS','BC','Bo','De','RIP','Re','PF'];
    const types = combat.filter(k => (avail[k] || 0) > 0);
    const fixed = cfg.fixed || {}; let evals = 0; const cache = new Map();
    const evalU = u => {
      const all = Object.assign({}, u); for (const k in fixed) all[k] = (all[k] || 0) + fixed[k];
      Object.keys(all).forEach(k => { if (!all[k]) delete all[k]; });
      const key = JSON.stringify(all); if (cache.has(key)) return cache.get(key);
      if (!Object.keys(all).length) return null;
      evals++;
      const st = simulate({ units: all, tech }, def, Object.assign({}, opts, { runs: cfg.runs || 100 }));
      const loss = st.costA[0] + st.costA[1] * cfg.ratioC + st.costA[2] * cfg.ratioD;
      const extra = cfg.cost ? cfg.cost(all) : 0;
      const r = { units: all, esc: Object.assign({}, u), st, win: st.A / st.n, loss, obj: loss + extra, value: Object.entries(all).reduce((a, [k, n]) => a + n * (U[k][1] + U[k][2] + U[k][3]), 0) };
      cache.set(key, r); return r;
    };
    const descend = (start, budget) => {
      let best = evalU(start); if (!best || best.win < cfg.minWin) return best;
      const limit = evals + budget; let improved = true;
      while (improved && evals < limit) {
        improved = false;
        for (const f of fracs) {
          for (const k of types) {
            if (!best.esc[k]) continue;
            const n = best.esc[k]; const drop = f === 0 ? 1 : Math.max(1, Math.floor(n * f));
            const e = evalU(Object.assign({}, best.esc, { [k]: n - drop })); if (better(e, best)) { best = e; improved = true; }
            if (evals >= limit) break;
          }
          if (improved) break;
        }
      }
      return best;
    };
    const better = (a, b) => a && a.win >= cfg.minWin && (a.obj < b.obj - 1 || (a.obj <= b.obj + Math.max(50, b.obj * 0.01) && a.value < b.value));
    const fracs = [1, 0.5, 0.25, 0.1, 0];
    const full = {}; types.forEach(k => full[k] = avail[k]);
    const fullE = evalU(full); if (!fullE) return null;
    if (fullE.win < cfg.minWin) return { impossible: true, best: fullE, evals };
    // several starting points (whole fleet, then each type alone and the main pairs) to avoid a local optimum
    const starts = [full];
    types.forEach(k => starts.push({ [k]: avail[k] }));
    for (let i = 0; i < types.length; i++) for (let j = i + 1; j < types.length; j++) starts.push({ [types[i]]: avail[types[i]], [types[j]]: avail[types[j]] });
    const total = cfg.maxEvals || 120; const per = Math.max(8, Math.floor(total / starts.length));
    let best = fullE;
    for (const s of starts) { if (evals >= total) break; const r = descend(s, per); if (r && r.win >= cfg.minWin && (r.obj < best.obj - 1 || (r.obj <= best.obj + Math.max(50, best.obj * 0.01) && r.value < best.value))) best = r; }
    return { best, evals };
  }

  // split a paste holding several spy reports
  function splitReports(text) {
    const parts = text.split(/(?=Rapport d.espionnage de)/i).map(s => s.trim()).filter(s => s.length > 40);
    return parts.length ? parts : [text];
  }
  // ship speeds (base) and drive used
  const SPEED = { LF: [12500, 'comb'], HF: [10000, 'imp'], Cr: [15000, 'imp'], BS: [10000, 'hd'], BC: [10000, 'hd'], Bo: [4000, 'imp'], De: [5000, 'hd'], RIP: [100, 'hd'], Re: [7000, 'hd'], PF: [12000, 'hd'], SC: [5000, 'comb'], LC: [7500, 'comb'], Col: [2500, 'imp'], Rec: [2000, 'comb'], EP: [100000000, 'comb'] };
  const FUEL = { LF: 20, HF: 75, Cr: 300, BS: 500, BC: 250, Bo: 700, De: 1000, RIP: 1, Re: 1100, PF: 300, SC: 10, LC: 50, Col: 1000, Rec: 300, EP: 1 };
  function shipSpeed(k, R, collector) {
    const [base, drv] = SPEED[k] || [10000, 'comb'];
    const lvl = drv === 'comb' ? (R.rComb || 0) : drv === 'imp' ? (R.rImp || 0) : (R.rHD || 0);
    const per = drv === 'comb' ? 0.1 : drv === 'imp' ? 0.2 : 0.3;
    return base * (1 + per * lvl + (collector && (k === 'SC' || k === 'LC') ? 1 : 0));
  }
  // ---------- defence planner: enough defence that raiding the planet no longer pays for an attacker of your level ----------
  const DEF_REQ = { RL: { sy: 1 }, LL: { sy: 2, rEnergy: 1, rLaser: 3 }, HL: { sy: 4, rEnergy: 3, rLaser: 6 }, GC: { sy: 6, rEnergy: 6, rWeap: 3, rShield: 1 }, IC: { sy: 4, rIon: 4 }, PT: { sy: 8, rPlasma: 7 }, SS: { sy: 1, rShield: 2 }, LS: { sy: 6, rShield: 6 } };
  // budget shares, by cost: several mixes are tried and the cheapest one that does the job wins
  const DEF_MIXES = [
    { RL: 0.30, LL: 0.25, HL: 0.15, GC: 0.20, PT: 0.10 },
    { RL: 0.25, LL: 0.20, HL: 0.10, GC: 0.20, PT: 0.25 },
    { RL: 0.20, LL: 0.15, HL: 0.05, GC: 0.30, PT: 0.30 }, // heavy guns: bombers have no rapid fire on Gauss and plasma
  ];
  const DEF_SHARE = DEF_MIXES[0];
  // cfg: { have:{RL..LS}, sy, R, stock:{m,c,d}, ratioC, ratioD, dfShips, dfDef, dfDeut, lootPct, attackers:[...], threatMsu }
  function planDefense(cfg) {
    const rc = cfg.ratioC, rd = cfg.ratioD, R = cfg.R || {};
    const msuOf = k => U[k][1] + U[k][2] * rc + U[k][3] * rd;
    const ok = k => Object.entries(DEF_REQ[k]).every(([q, l]) => (q === 'sy' ? cfg.sy || 0 : R[q] || 0) >= l);
    const avail = Object.keys(DEF_SHARE).filter(ok);
    const stock = cfg.stock || {}; const lootPct = cfg.lootPct ?? 0.5;
    const lootMsu = ((stock.m || 0) + (stock.c || 0) * rc + (stock.d || 0) * rd) * lootPct;
    const tech = { weap: R.rWeap || 0, shield: R.rShield || 0, armour: R.rArmour || 0 };
    const opts = { dfShips: cfg.dfShips ?? 0.3, dfDef: cfg.dfDef ?? 0, dfDeut: cfg.dfDeut ?? true, lootPct, hyperA: R.rHyper || 0, rnd: mulberry(777) };
    const capLC = 25000 * (1 + 0.05 * (R.rHyper || 0));
    const lc = Math.ceil(lootMsu / capLC) || 0; // the attacker brings the cargo for the loot
    const attackers = (cfg.attackers || ['Cr', 'BS', 'Bo']);
    const val = v => v[0] + v[1] * rc + v[2] * rd;
    const defRes = { m: stock.m || 0, c: stock.c || 0, d: stock.d || 0 };
    // best gain an attacker can make with one ship type (+ cargo) against these defences
    function worst(defUnits) {
      const units = {}; Object.entries(defUnits).forEach(([k, n]) => { if (n > 0) units[k] = n; });
      if (!Object.keys(units).length) return { gain: lootMsu, by: null, n: 1 };
      const def = { units, tech, res: defRes };
      let w = { gain: -Infinity, by: null, n: 0 };
      for (const a of attackers) {
        // an attacker of your level: his fleet is worth at most threatMsu (default: no limit but 20x the loot)
        const cap = Math.max(1, Math.floor(Math.min(20 * Math.max(lootMsu, 1e5), cfg.threatMsu || Infinity) / msuOf(a)));
        const sim = (n, runs) => simulate({ units: lc ? { [a]: n, LC: lc } : { [a]: n }, tech }, def, Object.assign({}, opts, { runs, rnd: mulberry(99) }));
        const wins = n => { const s = sim(n, 10); return s.A / s.n >= 0.9; };
        let hi = 1; while (hi <= cap && !wins(hi)) hi *= 2;
        if (hi > cap) { if (!wins(cap)) continue; hi = cap; }
        let lo = Math.floor(hi / 2); for (let i = 0; i < 6 && hi - lo > 1; i++) { const m = (lo + hi) >> 1; if (wins(m)) hi = m; else lo = m; }
        for (const f of [1, 1.5, 2.5]) {
          const n = Math.min(cap, Math.ceil(hi * f)); if (f > 1 && n === hi) continue; const s = sim(n, 14);
          const gain = val(s.lootIfWin) * (s.A / s.n) + val(s.debris) - val(s.costA);
          if (gain > w.gain) w = { gain, by: a, n };
        }
      }
      return w;
    }
    let mix = DEF_SHARE;
    const plus = k => { // additions for a budget of k (metal units), with the current mix
      const add = {}; if (k <= 0) return add; const tot = avail.reduce((a, t) => a + mix[t], 0);
      avail.forEach(t => { const n = Math.round(k * mix[t] / tot / msuOf(t)); if (n > 0) add[t] = n; });
      if (ok('SS') && !(cfg.have.SS > 0)) add.SS = 1;
      if (ok('LS') && !(cfg.have.LS > 0) && k >= 3 * msuOf('LS')) add.LS = 1;
      return add;
    };
    const merged = add => { const u = Object.assign({}, cfg.have); Object.entries(add).forEach(([k, n]) => { u[k] = (u[k] || 0) + n; }); return u; };
    const costOf = add => { const c = [0, 0, 0]; Object.entries(add).forEach(([k, n]) => { c[0] += n * U[k][1]; c[1] += n * U[k][2]; c[2] += n * U[k][3]; }); return c; };
    const now = worst(cfg.have);
    if (now.gain <= 0) return { safe: true, add: {}, cost: [0, 0, 0], lootMsu, before: now, after: now };
    if (!avail.length) return { safe: false, noShipyard: true, add: {}, cost: [0, 0, 0], lootMsu, before: now, after: now };
    const kMax = 10 * Math.max(lootMsu, 1e5); let best = null; const tried = [];
    const mixes = avail.includes('PT') ? DEF_MIXES : DEF_MIXES.slice(0, 1);
    for (const m of mixes) {
      mix = m;
      let k = Math.max(2e4, lootMsu * 0.1), w = worst(merged(plus(k)));
      while (w.gain > 0 && k < kMax) { k *= 2; w = worst(merged(plus(k))); }
      if (w.gain > 0) { if (!best) best = { tooBig: true, add: plus(k), w }; continue; }
      let lo = k / 2, hi = k, wHi = w;
      for (let i = 0; i < 5; i++) { const md = (lo + hi) / 2; const wm = worst(merged(plus(md))); if (wm.gain <= 0) { hi = md; wHi = wm; } else lo = md; }
      const add = plus(hi); const v = val(costOf(add)); tried.push({ v, add });
      if (!best || best.tooBig || v < best.v) best = { add, v, w: wHi };
    }
    if (best.tooBig) return { safe: false, tooBig: true, add: best.add, cost: costOf(best.add), lootMsu, before: now, after: best.w };
    return { safe: false, add: best.add, cost: costOf(best.add), lootMsu, before: now, after: best.w, tried };
  }

  return { U, SHIPS, ATTACK_SHIPS, DEFS, RF, parseReport, planDefense, DEF_REQ, splitReports, simulate, optimize, buildSide, num, shipSpeed, FUEL };
})();
if (typeof module !== 'undefined') module.exports = CB;
