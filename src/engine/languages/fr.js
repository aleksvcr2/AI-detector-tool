/* French language pack. */

const RANKED = `le de un à être et en avoir que pour dans ce il qui ne sur se pas plus pouvoir par je avec tout faire son mettre autre on mais nous comme mon lui aller leur vous dans ou si les des du au aux la une ces cette cet mes tes ses nos vos ta ta ton votre notre leurs elle ils elles moi toi eux y en dont où quand donc alors très bien aussi encore déjà toujours jamais souvent parfois peu beaucoup trop assez moins plutôt surtout enfin ensuite puis ainsi cependant pourtant néanmoins toutefois car parce puisque lorsque tandis quoique bien-que sans sous entre chez vers depuis pendant avant après contre selon malgré sauf outre parmi
être avoir faire dire aller voir savoir pouvoir vouloir venir devoir prendre trouver donner falloir parler mettre passer rester croire demander tenir aimer porter montrer continuer penser suivre connaître paraître comprendre attendre sortir entrer entendre chercher commencer partir sembler laisser vivre écrire lire tomber devenir revenir arriver appeler jouer perdre gagner ouvrir fermer répondre recevoir servir sentir apprendre expliquer choisir décider accepter refuser permettre produire créer développer utiliser employer proposer présenter obtenir garder rendre offrir ajouter changer terminer finir réussir manquer occuper agir exister apparaître augmenter réduire améliorer assurer déterminer identifier décrire discuter appliquer comparer analyser réviser approuver rejeter prouver alléguer nier accorder ordonner signer envoyer soumettre référer attribuer enregistrer remplacer révéler partager stocker suivre former visiter
an année jour temps fois homme femme enfant vie monde pays part main chose cas moment maison travail place lieu heure mot nom nuit soir matin semaine mois groupe problème état ville exemple personne gens famille gouvernement programme système entreprise service prix valeur niveau nombre processus résultat raison cause effet changement fait question réponse idée livre corps tête oeil visage père mère fils fille ami équipe membre joueur jeu école étudiant professeur rue voiture route air lumière force énergie nature santé esprit coeur argent marché produit droit loi
demandeur défendeur avocat témoin témoignage déposition requête statut règlement contrat clause responsabilité dommages accord réclamant jugement appel verdict jury audience pièce assignation négligence blessure assureur police prime couverture sinistre traitement diagnostic thérapie rétablissement accident collision véhicule conducteur passager faute honoraires client dossier cabinet
grand petit bon mauvais nouveau vieux jeune long court haut bas meilleur pire premier dernier seul même propre général spécifique commun spécial semblable différent plusieurs entier complet plein vide clair sombre fort faible dur doux facile difficile simple complexe important nécessaire possible impossible disponible raisonnable significatif pertinent approprié efficace réussi utile précieux sérieux grave critique central principal secondaire final initial original actuel récent précédent futur passé présent prochain certain probable vrai faux réel potentiel local national public privé social politique économique financier juridique médical technique
modèle analyse méthode approche cadre structure fonction caractéristique élément facteur variable mesure métrique échantillon population moyenne médiane variance écart distribution motif tendance signal bruit seuil estimation probabilité confiance intervalle corrélation régression classification exactitude précision erreur biais référence contrôle expérience hypothèse conclusion résumé section figure tableau annexe citation
paysage domaine approfondir naviguer éventail pléthore paradigme holistique robuste intégral exploiter utiliser faciliter optimiser améliorer favoriser cultiver entreprendre débloquer libérer complexe nuancé multiforme inestimable crucial vital primordial profond notable convaincant captivant fascinant intrigant témoignage pierre angulaire fondamental essentiel`;

const V = "aeiouyàâäéèêëîïôöùûüœæ";
function syllables(w) {
  const s = w.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüÿœæç]/g, "");
  if (!s) return 0;
  let t = s;
  // Silent final e, and the silent -es / -ent verb endings. The -ment suffix
  // (gouvernement, rapidement) is pronounced, so it is excluded.
  t = t.replace(/(?<!m)ent$/, "").replace(/es$/, "").replace(/e$/, "");
  let count = 0, prev = false;
  for (const ch of t) {
    const v = V.includes(ch);
    if (v && !prev) count++;
    prev = v;
  }
  return Math.max(1, count);
}

export default {
  code: "fr",
  name: "French",
  endonym: "Français",
  calibration: "secondary",
  ranked: RANKED,
  syllables,
  /** Kandel–Moles adaptation of Flesch for French. */
  readability: (words, sents, syll) => 207 - 1.015 * (words / sents) - 73.6 * (syll / words),
  readabilityName: "Kandel–Moles",
  // Elision (l', d', n'est) is mandatory in French, so it is not a style choice.
  contractionRe: null,
  functionWords: `le de un à et en que qui ne pas plus par je avec tout son autre on mais nous comme mon lui leur vous ou si les des du au aux la une ces cette cet mes tes ses nos vos ton votre notre leurs elle ils elles moi toi eux y dont où quand donc alors très bien aussi encore déjà toujours jamais souvent peu beaucoup trop assez moins plutôt enfin ensuite puis ainsi cependant pourtant car parce puisque lorsque tandis sans sous entre chez vers depuis pendant avant après contre selon malgré sauf parmi est sont était être ce cela ceci`,
  discourseMarkers: `cependant | toutefois | néanmoins | de plus | en outre | par conséquent | donc | ainsi | par ailleurs | d'une part | d'autre part | en revanche | au contraire | par exemple | c'est-à-dire | en effet | en conclusion | en résumé | en somme | premièrement | deuxièmement | enfin | finalement | notamment | il convient de noter | cela dit | de ce fait`,
  registerMarkers: `dans le monde actuel | à l'ère numérique | il est important de noter | il est important de souligner | il convient de noter | il convient de souligner | il est essentiel | il est crucial | joue un rôle crucial | joue un rôle essentiel | joue un rôle fondamental | une myriade de | un large éventail de | une pléthore de | approfondir | le paysage | dans le domaine de | en fin de compte | approche holistique | cadre robuste | exploiter la puissance | libérer le potentiel | pierre angulaire | un témoignage de | en constante évolution | souligne l'importance | met en lumière | à sa base | lorsqu'il s'agit de | en conclusion | pour conclure | en résumé | points clés | étape par étape | avantages et inconvénients | en tant que modèle de langage | j'espère que cela vous aidera | dans cet article | non seulement | mais aussi`,
  hedges: `peut | pourrait | peuvent | pourraient | peut-être | possiblement | probablement | généralement | en général | souvent | a tendance à | ont tendance à | apparemment | semble | semblent | dans une certaine mesure | relativement | dans certains cas | largement | parfois`,
  intensifiers: `très | vraiment | extrêmement | incroyablement | absolument | totalement | tout-à-fait | assez | trop | si | profondément | énormément`,
  firstPerson: `je j'ai me moi mon ma mes nous notre nos nôtre j'étais j'aime`,
  abbreviations: `m mm mme mlle dr pr me mes prof etc ex p.ex cf ibid id fig figs chap ch art arts vol vols éd éds p pp no nos av bd bld sté sarl sa inc jan fév mar avr mai juin juil août sept oct nov déc lun mar mer jeu ven sam dim a b c d e f g h i j k l m n o p q r s t u v w x y z`,
  bands: {
    sentMean: { center: 23, spread: 7.5 },
    sentSd: { center: 11, spread: 3.5 },
    bandRate: { center: 0.31, spread: 0.11 },
    shortRate: { center: 0.14, spread: 0.08 },
    longRate: { center: 0.13, spread: 0.08 },
    funcRate: { center: 0.50, spread: 0.05 },
    firstPerson: { center: 12, spread: 10 },
    passive: { center: 0.15, spread: 0.09 },
    oovRate: { center: 0.33, spread: 0.10 },
    surpMean: { center: 10.8, spread: 1.2 },
    flesch: { center: 58, spread: 16 },
  },
  holds: { contraction: "French elision is mandatory, not a style choice" },
};
