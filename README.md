Pour chaque planète, l'application regarde ses trois prochaines
constructions et prend la première qui attend des ressources (et non la
fin de la construction précédente). Elle cherche le stock des autres
planètes (chacune garde de quoi lancer ses trois prochaines constructions)
et propose le transport le plus court : quantités, grands transporteurs
disponibles, durée du vol (vitesse des flottes pacifiques du serveur) et
deutérium. Le transport n'est proposé que s'il permet de lancer la
construction plus tôt qu'en attendant la production.

# OGame : conseiller de construction

Application personnelle pour OGame (univers FR s285, classe Collecteur).
Un seul fichier HTML autonome, sans serveur ni installation. Elle tourne
dans le navigateur et s'installe sur l'écran d'accueil du téléphone.

## Calage sur le jeu

Le favori lit aussi, pour chaque planète, la production réelle par heure et
la capacité des hangars affichées par OGame, ainsi que les officiers
actifs. L'application ajuste ses bonus pour retomber sur ces chiffres et
affiche l'écart (« bonus non identifiés ») : objets, recherches de formes
de vie, niveau de l'espèce, événements. Réglages manuels : classe
d'alliance Marchands, bonus supplémentaires, ou désactiver le calage.

## Missiles interplanétaires

Chaque missile fait 12 000 dégâts (+10 % par niveau de ta technologie
armes) ; une défense tient (métal + cristal) / 10 (+10 % par niveau de
protection du défenseur). Chaque missile d'interception adverse en arrête
un. La cible prioritaire est touchée d'abord, le reste va aux défenses les
moins chères. Les défenses détruites ne se reconstruisent pas et ne
laissent pas de débris. Portée : 5 x propulsion à impulsion - 1 systèmes,
dans la même galaxie ; silo de missiles niveau 4 minimum, 2 places sur
10 par niveau.

Onglet Cibles : pour chaque cible dont la défense est visible,
l'application essaie de 1 à 64 missiles (en plus de ses missiles
d'interception) sur les 3 défenses qui pèsent le plus, puis recalcule la
flotte. Elle affiche l'option si elle rapporte plus que sans missiles (ou
rend possible une cible trop défendue), avec la planète de lancement, le
silo nécessaire et la durée du vol. Onglet Combat : nombre de missiles,
missiles d'interception (lus dans le rapport) et cible prioritaire,
appliqués avant la simulation.

## Onglet Recherche

Les recherches sont lancées sur une seule planète (par défaut celle qui a le
meilleur laboratoire, réglable), tant que le Réseau de recherche
intergalactique n'est pas actif. Elles sont payées par un pot : une part
(20 % par défaut) du stock et de la production de toutes les planètes,
que tu envoies vers la planète de recherche. Le reste finance les
bâtiments dans le plan. Ordre : astrophysique jusqu'à la prochaine
planète, plasma quand elle s'amortit presque aussi vite que les mines,
puis, de la moins chère à la plus chère, ordinateur 10, espionnage 10,
hyperespace 8 et Réseau de recherche, armes, bouclier et protection 10,
énergie 10, réacteurs, laser 12. Le laboratoire de la planète de
recherche monte jusqu'au niveau 10 dans son plan.

## Défense de chaque planète

Pour chaque planète, l'application simule le raid le plus rentable d'un
attaquant de ton niveau (tes technologies, une flotte jusqu'à 2 fois la
tienne, réglable) en croiseurs, vaisseaux de bataille ou bombardiers,
avec les transporteurs pour le butin (50 % du stock de l'export) et le
recyclage de ses propres débris. Si ce raid rapporte, elle cherche la
plus petite défense (mélange lanceurs, lasers, Gauss, plasma, boucliers)
qui le rend perdant, et affiche sur la carte de la planète combien en construire pour chaque défense et le total à atteindre (recalculé à chaque export). Dans le
plan, cette défense est payée en premier (désactivable).

## Onglet Planètes

On colle un export texte de ses planètes (bâtiments, formes de vie,
recherches, flotte, paramètres du serveur). L'application calcule pour
chaque planète :

- la production réelle par heure (vitesse de l'univers, position,
  classe, plasma, bâtiments et recherches de formes de vie)
- le bilan d'énergie et la source d'énergie la moins chère
- le temps avant que chaque hangar soit plein
- le temps de remboursement de chaque mine

Puis elle classe quoi construire. Les trois constructions affichées sont
les trois premières étapes de l'onglet Plan : une seule règle décide de la
file de construction (énergie manquante, robots jusqu'à 4, hangar qui
déborderait avant de pouvoir payer la suite, infrastructure si elle coûte
moins que la meilleure mine, sinon la mine la plus rentable). Les formes de
vie et la défense, qui ont leur propre file, sont listées à part. Elle
propose aussi les prochaines recherches.

## Transports conseillés (Vue générale)

Quand la construction n°1 d'une planète n'est pas faisable, l'application
cherche le stock des autres planètes (chacune garde de quoi lancer sa
propre construction n°1) et propose le transport le plus court : quantités,
grands transporteurs disponibles, durée du vol (vitesse des flottes
pacifiques du serveur) et deutérium. Le transport n'est proposé que s'il
est plus rapide que d'attendre la production.

## Onglet Plan

Simulation sur 1, 3 ou 7 jours, planète par planète : attente des
ressources, construction (durée selon l'usine de robots, les nanites et la
vitesse de l'univers), puis recalcul de la production. Mêmes règles de
choix que l'onglet Planètes (énergie, hangars, mine la plus rentable).
Affiche l'heure de lancement de chaque construction, regroupée par jour,
et la production attendue en fin de période.

## Onglet Combat

On colle un rapport d'espionnage (texte copié depuis OGame). Le lecteur
remplit ressources, flotte, défense et technologies, puis simule le
combat plusieurs centaines de fois avec les règles OGame : 6 rounds,
boucliers, rapidfire, explosion sous 70 % de coque.

Résultat : chances de victoire, pertes, butin, champ de débris, gain net,
nombre de grands transporteurs et de recycleurs à envoyer.

## Flotte optimale (onglets Combat et Cibles)

Recherche locale à partir de toute la flotte disponible sur la planète de
départ, de chaque type de vaisseau seul et des paires de types : on retire
des vaisseaux (moitié, quart, dixième, un par un) tant que la victoire
reste au-dessus du seuil et que le coût (pertes moyennes + deutérium
aller-retour, en équivalent métal) ne remonte pas. Les grands
transporteurs nécessaires au butin sont ajoutés d'office.

## Onglet Cibles

Flotte idéale : quand ta flotte ne suffit pas, l'application cherche,
parmi les vaisseaux que tu peux construire (chantier spatial et
recherches), le renfort d'un seul type le moins cher qui gagne, essaie
aussi 2 et 3 fois plus pour réduire les pertes, ajoute les grands
transporteurs du butin, puis affiche ce qu'il faut construire, son coût,
le gain par raid et le nombre de raids pour le rembourser.

On colle un ou plusieurs rapports d'espionnage ; ils restent enregistrés
dans le navigateur (un rapport plus récent sur la même planète remplace
l'ancien). Pour chaque cible : plusieurs escortes possibles tirées de la
flotte de la planète de départ, simulées, puis l'escorte au meilleur gain
qui atteint la victoire minimale est retenue, avec les grands
transporteurs nécessaires, le vol aller-retour (vitesse des flottes de
guerre du serveur), le deutérium et le gain net. Tri par gain par heure de
vol ; « Simuler » ouvre la cible dans l'onglet Combat.

## Onglet Expéditions

Plafond des découvertes selon les points du top 1 (lus par le favori dans
`/api/highscore.xml`), découverte maximale, nombre d'expéditions
simultanées, et flotte à envoyer par expédition : grands transporteurs
pour ramener la plus grosse découverte, puis vaisseaux de combat jusqu'au
plafond de points d'expédition. Multiplicateur réglable pour caler sur les
découvertes réelles.

## Onglet Historique

On colle ses messages de combat et d'expédition ; chaque message est
identifié par une empreinte et n'est compté qu'une fois. Bilan sur 7 jours,
30 jours ou tout l'historique : raids (butin, débris, pertes, gain net) et
expéditions (répartition des résultats, ressources, antimatière, vaisseaux,
moyenne). La plus grosse découverte sert à proposer le multiplicateur de
l'onglet Expéditions. Saisie manuelle possible.


Chaque raid se déplie pour le détail du combat : date, cible (joueur, planète, classe), planète de départ, nombre de rounds, butin, débris et recycleurs, tes pertes, gain net, honneur, technologies des deux camps, ta flotte (envoyés, perdus) et son camp (avant, détruits, défenses réparées). Le texte du rapport est gardé : les améliorations du lecteur s'appliquent aussi aux anciens raids.

## Onglet Export (premier onglet)

C'est l'onglet d'ouverture : bouton « Coller mon export » (qui bascule
ensuite sur l'onglet Planètes), export texte, réglages, et installation
du favori. Un favori (bookmarklet) à glisser dans la barre de favoris. Cliqué sur
une page d'OGame, il lit les pages de chaque planète (ressources,
installations, formes de vie, chantier spatial, défense), les recherches
et `/api/serverData.xml`, puis produit l'export et l'ouvre dans
l'application (`#import=`). Code source : `src/exporter.js`.

## Synchronisation entre appareils (onglet Export)

Chaque navigateur garde ses propres données (sur iPhone, l'application
de l'écran d'accueil et Safari aussi). Avec un code GitHub qui n'a que le
droit `gist`, chaque appareil connecté lit et écrit un gist secret
`ogame-conseiller.json` : à l'ouverture, au retour sur l'application et
moins d'une seconde après chaque changement.

- Export : le plus récent selon sa date d'export.
- Réglages : la dernière modification gagne.
- Cibles et historique : fusionnés. Une suppression est propagée (gardée
  60 jours) ; un rapport collé de nouveau après une suppression revient.
- Calculs en cache (flottes des cibles, défense) : non synchronisés,
  refaits sur chaque appareil.

Code : `sySync`, `syMerge` dans `src/template.html`.

## Données

Sans synchronisation, rien n'est envoyé nulle part : tout reste dans le
navigateur (localStorage). Avec la synchronisation, les mêmes données
vont dans un gist secret du compte GitHub de l'utilisateur. Aucune donnée
de compte n'est stockée dans ce dépôt.

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

## Versions

L'app affiche son numéro de version et sa date en bas, avec un bouton **Rechercher une mise à jour** et la liste des **Nouveautés**. Chaque changement se publie avec :

```
node tools/release.mjs patch "Ce qui change, en mots simples"
```

`patch` pour une correction, `minor` pour une nouveauté visible, `major` pour une refonte. Le script garde la page, `version.json` et `changelog.json` en accord, puis relance `node tools/build.js`. La section elle-même est `updates.js`, commune à toutes les apps.
