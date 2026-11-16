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
    const TECH = { weap: ['technologie armes', 'technologie des armes'], shield: ['technologie bouclier', 'technologie des boucliers', 'technologie de bouclier'], armour: ['technologie protection des vaisseaux spatiaux', 'technologie de protection des vaisseaux spatiaux', 'protection des vaisseaux spatiaux'], hyper: ['technologie hyperespace'] };
    for (const [k, arr] of Object.entries(TECH)) for (const a of arr) { const v = grab(a); if (v != null) { out.tech[k] = v; out.found++; break; } }
    const RES = { m: '(?<!de\\s)metal', c: '(?<!de\\s)cristal', d: '(?<!de\\s)(?<!en\\s)deuterium' };
    for (const [k, a] of Object.entries(RES)) { const re = new RegExp('(?:^|[^a-z])' + a + '\\s*:?\\s*' + NUM, 'g'); let m, v = null; while ((m = re.exec(t))) v = num(m[1]); if (v != null) { out.res[k] = v; out.found++; } }
    const lm = t.match(/butin\s*:?\s*(\d{1,3})(?!\d)/); if (lm) out.lootPct = +lm[1];
    const cm = t.match(/classe\s*:\s*(le |la )?(collecteur|general|explorateur)/); if (cm) out.cls = cm[2];
    out.noResearch = /recherche\s+aucune donnee fiable/.test(t);
    const pm = text.match(/\[(\d+:\d+:\d+)\]/); if (pm) out.coords = pm[1];
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
    let cap = 0; for (const k in stat.survA) { let c = U[k][6] * cargoMult; if (opts.attackerCollector && (k === 'SC' || k === 'LC')) c *= 1.25; cap += stat.survA[k] * c; }
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

  return { U, SHIPS, ATTACK_SHIPS, DEFS, RF, parseReport, simulate, buildSide, num };
})();
if (typeof module !== 'undefined') module.exports = CB;
