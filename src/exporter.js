// OGame export bookmarklet: run on any OGame page while logged in.
// Reads each planet's pages (same site, your own session), builds the text export used by the advisor.
(async () => {
  if (window.__ogExportRunning) return; window.__ogExportRunning = true;
  const APP = 'https://gluminou.github.io/ogame/';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const N = {
    1: 'Mine de metal', 2: 'Mine de cristal', 3: 'Synthetiseur de deuterium', 4: 'Centrale electrique solaire', 12: 'Centrale electrique de fusion',
    22: 'Hangar de metal', 23: 'Hangar de cristal', 24: 'Reservoir de deuterium', 212: 'Satellite solaire', 217: 'Foreuse',
    14: 'Usine de robots', 21: 'Chantier spatial', 31: 'Laboratoire de recherche', 34: 'Depot de ravitaillement', 44: 'Silo de missiles',
    15: 'Usine de nanites', 33: 'Terraformeur', 36: 'Dock Spatial',
    113: 'Technologie energetique', 120: 'Technologie laser', 121: 'Technologie a ions', 114: 'Technologie hyperespace', 122: 'Technologie plasma',
    115: 'Reacteur a combustion', 117: 'Reacteur a impulsion', 118: 'Propulsion hyperespace', 106: 'Technologie espionnage', 108: 'Technologie ordinateur',
    124: 'Astrophysique', 123: 'Reseau de recherche intergalactique', 199: 'Technologie graviton', 109: 'Technologie armes', 110: 'Technologie bouclier',
    111: 'Technologie protection des vaisseaux spatiaux',
    204: 'Chasseur leger', 205: 'Chasseur lourd', 206: 'Croiseur', 207: 'Vaisseau de bataille', 215: 'Traqueur', 211: 'Bombardier', 213: 'Destructeur',
    214: 'Etoile de la mort', 218: 'Faucheur', 219: 'Eclaireur', 202: 'Petit transporteur', 203: 'Grand transporteur', 208: 'Vaisseau de colonisation',
    209: 'Recycleur', 210: "Sonde d'espionnage",
    401: 'Lanceur de missiles', 402: 'Artillerie laser legere', 403: 'Artillerie laser lourde', 404: 'Canon de Gauss', 405: 'Artillerie a Ions',
    406: 'Lanceur de plasma', 407: 'Petit bouclier', 408: 'Grand bouclier', 502: "Missile d'interception", 503: 'Missile interplanetaire',
    11101: 'Secteur residentiel', 11102: 'Ferme Biospherique', 11103: 'Centre de recherche', 11104: 'Academie des sciences', 11105: 'Centre de neurocalibrage',
    11106: 'Fusion a haute energie', 11107: 'Reserve alimentaire', 11108: 'Extraction par fusion', 11109: "Tour d'habitation", 11110: 'Laboratoire de biotechnologie',
    11111: 'Metropolis', 11112: 'Bouclier planetaire',
    12101: 'Enclave stoique', 12102: 'Culture du cristal', 12103: 'Centre technologique runique', 12104: 'Forge runique', 12105: 'Orictorium',
    12106: 'Fusion magmatique', 12107: 'Chambre de disruption', 12108: 'Monument rocheux', 12109: 'Raffinerie de cristaux', 12110: 'Synthetiseur de deuterium',
    12111: 'Centre de recherche sur les mineraux', 12112: 'Usine de traitement a haut rendement',
    11201: 'Ambassadeurs intergalactiques', 11202: 'Extracteurs a haute performance', 11203: 'Moteurs a fusion', 11204: 'Generateur de champ de camouflage',
    11205: 'Planque Orbitale', 11206: 'IA de recherche', 12201: 'Batteries volcaniques',
  };
  const RES = [1, 2, 3, 4, 12, 22, 23, 24];

  // ---------- overlay ----------
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:5% 10%;z-index:2147483647;background:#0b1020;color:#e6ebf7;border:2px solid #f5a623;border-radius:12px;padding:16px;font:14px/1.45 Arial,sans-serif;display:flex;flex-direction:column;gap:10px;box-shadow:0 10px 40px #000';
  box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px;color:#f5a623">Export pour le conseiller OGame</b><button data-x style="background:none;border:0;color:#e6ebf7;font-size:22px;cursor:pointer">×</button></div><div data-msg>Préparation…</div><textarea data-out style="flex:1;width:100%;background:#050914;color:#e6ebf7;border:1px solid #26335a;border-radius:8px;padding:8px;font:12px monospace" readonly></textarea><div style="display:flex;gap:8px;flex-wrap:wrap"><button data-copy disabled style="background:#f5a623;border:0;border-radius:8px;padding:9px 16px;font-weight:bold;cursor:pointer">Copier</button><button data-open disabled style="background:#18223d;color:#e6ebf7;border:1px solid #26335a;border-radius:8px;padding:9px 16px;cursor:pointer">Ouvrir dans le conseiller</button><span data-note style="align-self:center;color:#8f9bbd"></span></div>';
  document.body.appendChild(box);
  const q = s => box.querySelector(s);
  const msg = t => { q('[data-msg]').textContent = t; };
  q('[data-x]').onclick = () => { box.remove(); window.__ogExportRunning = false; };

  try {
    // ---------- planets ----------
    const planets = [...document.querySelectorAll('#planetList .smallplanet')].map(el => {
      const id = (el.id || '').replace(/\D/g, '');
      const name = (el.querySelector('.planet-name')?.textContent || '').trim();
      const coords = (el.querySelector('.planet-koords')?.textContent || '').replace(/[\[\]\s]/g, '');
      const title = el.querySelector('a.planetlink')?.getAttribute('title') || el.querySelector('a.planetlink')?.getAttribute('data-tooltip-title') || '';
      const tm = title.replace(/<[^>]+>/g, ' ').match(/(-?\d+)\s*°C\s*\S*\s*(-?\d+)\s*°C/);
      return { id, name, coords, tmax: tm ? +tm[2] : null };
    }).filter(p => p.id);
    if (!planets.length) throw new Error("Liste des planètes introuvable. Lance l'export depuis une page du jeu (Vue d'ensemble par exemple).");

    const base = location.origin + '/game/index.php?page=ingame&component=';
    const diag = [];
    let done = 0;
    const read = async (component, cp) => {
      const url = base + component + (cp ? '&cp=' + cp : '');
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error(component + ' : erreur ' + r.status);
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const out = {};
      doc.querySelectorAll('[data-technology]').forEach(li => {
        const id = +li.getAttribute('data-technology'); if (!id || out[id] != null) return;
        const lv = li.querySelector('.level[data-value], .amount[data-value], [data-value]');
        let v = lv ? lv.getAttribute('data-value') : null;
        if (v == null) { const t = (li.querySelector('.level, .amount')?.textContent || '').replace(/[^\d]/g, ''); v = t || null; }
        if (v == null) return;
        const label = li.getAttribute('aria-label') || li.querySelector('[aria-label]')?.getAttribute('aria-label') || '';
        out[id] = { v: parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0, label: label.trim() };
      });
      if (!Object.keys(out).length) diag.push(component + (cp ? '@' + cp : '') + ' : rien lu');
      done++; msg(`Lecture… ${done} pages`);
      await sleep(350);
      return out;
    };
    const line = (techs, id) => techs[id] ? `${N[id] || techs[id].label || 'ID ' + id}: ${techs[id].v}` : null;
    const block = (techs, ids) => ids.map(id => line(techs, id)).filter(Boolean).join('\n');
    const others = (techs, known) => Object.keys(techs).map(Number).filter(id => !known.includes(id)).map(id => line(techs, id)).join('\n');

    const parts = [];
    for (const p of planets) {
      msg(`Lecture de ${p.name}…`);
      const sup = await read('supplies', p.id), fac = await read('facilities', p.id);
      const lfb = await read('lfbuildings', p.id), lfr = await read('lfresearch', p.id);
      const shp = await read('shipyard', p.id), def = await read('defenses', p.id);
      const all = Object.assign({}, sup, shp);
      const s = [`Planete: ${p.name}`, `Coordonnees: ${p.coords}`];
      if (p.tmax != null) s.push(`Temperature max: ${p.tmax}`);
      s.push('', 'Ressources', block(all, [...RES, 212, 217]), '', 'Forme de vie', others(lfb, []), '', 'Recherche Forme de vie:', others(lfr, []),
        '', 'Installations', others(fac, []), '', 'Defense:', others(def, []), '', 'Flotte:', others(shp, [212, 217]), '');
      parts.push(s.join('\n'));
    }
    msg('Lecture des recherches…');
    const rs = await read('research', planets[0].id);
    parts.push('Recherche:\n' + others(rs, []) + '\n');

    // ---------- server settings ----------
    try {
      const x = new DOMParser().parseFromString(await (await fetch(location.origin + '/api/serverData.xml')).text(), 'text/xml');
      const g = t => x.querySelector(t)?.textContent;
      const sv = ['Parametres de serveur:'];
      if (g('speed')) sv.push(`Vitesse de développement : x${g('speed')}`);
      if (g('researchDurationDivisor')) sv.push(`Vitesse de recherche : x${g('researchDurationDivisor')}`);
      if (g('debrisFactor')) sv.push(`Flotte dans le champ de débris +${Math.round(parseFloat(g('debrisFactor')) * 100)} %`);
      if (g('debrisFactorDef')) sv.push(`Installations de défense dans le champ de débris +${Math.round(parseFloat(g('debrisFactorDef')) * 100)} %`);
      if (g('deuteriumInDebris') === '1') sv.push('Deutérium dans les champs de débris');
      if (g('galaxies')) sv.push(`Nombre de galaxies: ${g('galaxies')}`);
      parts.push(sv.join('\n'));
    } catch (e) { diag.push('serverData : ' + e.message); }

    const text = parts.join('\n');
    q('[data-out]').value = text;
    msg(`Export prêt : ${planets.length} planètes, ${done} pages lues.` + (diag.length ? ' À vérifier : ' + diag.join(' ; ') : ''));
    const cb = q('[data-copy]'), ob = q('[data-open]'); cb.disabled = ob.disabled = false;
    cb.onclick = async () => { try { await navigator.clipboard.writeText(text); q('[data-note]').textContent = 'Copié !'; } catch (e) { q('[data-out]').select(); document.execCommand('copy'); q('[data-note]').textContent = 'Copié.'; } };
    ob.onclick = () => { const b64 = btoa(unescape(encodeURIComponent(text))); window.open(APP + '#import=' + encodeURIComponent(b64), '_blank'); };
  } catch (e) { msg('Erreur : ' + e.message); }
  window.__ogExportRunning = false;
})();
