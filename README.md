# OGame : conseiller de construction

Application personnelle pour OGame (univers FR s285, classe Collecteur).
Un seul fichier HTML autonome, sans serveur ni installation. Elle tourne
dans le navigateur et s'installe sur l'écran d'accueil du téléphone.

## Onglet Planètes

On colle un export texte de ses planètes (bâtiments, formes de vie,
recherches, flotte, paramètres du serveur). L'application calcule pour
chaque planète :

- la production réelle par heure (vitesse de l'univers, position,
  classe, plasma, bâtiments et recherches de formes de vie)
- le bilan d'énergie et la source d'énergie la moins chère
- le temps avant que chaque hangar soit plein
- le temps de remboursement de chaque mine

Puis elle classe quoi construire : urgences (énergie, hangars), meilleure
mine, infrastructure, formes de vie, défense. Elle propose aussi les
prochaines recherches.

## Onglet Combat

On colle un rapport d'espionnage (texte copié depuis OGame). Le lecteur
remplit ressources, flotte, défense et technologies, puis simule le
combat plusieurs centaines de fois avec les règles OGame : 6 rounds,
boucliers, rapidfire, explosion sous 70 % de coque.

Résultat : chances de victoire, pertes, butin, champ de débris, gain net,
nombre de grands transporteurs et de recycleurs à envoyer.

## Onglet Export auto

Un favori (bookmarklet) à glisser dans la barre de favoris. Cliqué sur
une page d'OGame, il lit les pages de chaque planète (ressources,
installations, formes de vie, chantier spatial, défense), les recherches
et `/api/serverData.xml`, puis produit l'export et l'ouvre dans
l'application (`#import=`). Code source : `src/exporter.js`.

## Données

Rien n'est envoyé nulle part. Le dernier export collé est gardé dans le
navigateur (localStorage). Aucune donnée de compte n'est stockée dans ce
dépôt.

## Limites

- Les bonus de formes de vie, de classe et d'alliance sur les vaisseaux
  ne sont pas comptés dans le simulateur.
- Parmi les recherches de formes de vie, seuls les Extracteurs à haute
  performance entrent dans le calcul de production.
- Les clés API des rapports (`sr-...`) ne peuvent pas être lues : il faut
  coller le texte du rapport.

## Modifier

Le code source est découpé en trois parties dans `src/` :
`engine.js` (planètes), `combat.js` (simulateur) et `template.html`
(interface). `node tools/build.js` les assemble dans `index.html` et
inscrit une nouvelle version dans `version.json`.

## Mises à jour

À chaque ouverture, et à chaque retour sur l'application, la page compare
sa version avec `version.json`. Si une nouvelle version a été publiée,
elle se recharge toute seule. Le bouton « Mettre à jour » en bas de page
force le rechargement.
