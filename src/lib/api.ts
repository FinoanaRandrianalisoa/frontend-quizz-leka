import { gql } from "./graphql";

export type Utilisateur = {
  id: string;
  pseudo: string;
  email?: string | null;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  villeOrigine?: string | null;
  telephone?: string | null;
  dateNaissance?: string | null;
  photoProfil?: string | null;
  photoCouverture?: string | null;
  enLigne?: boolean;
  dateJoined?: string;
  codeParrain?: string;
  isActive?: boolean;
};

export type Profil = {
  utilisateur: Utilisateur;
  partiesJouees: number;
  victoires: number;
  defaites: number;
  tauxReussite: number;
  cumulGains: string;
};

export type ClassementEntry = {
  rang: number;
  utilisateur: Utilisateur;
  parties: number;
  victoires: number;
  defaites: number;
  tauxReussite: number;
};

export type Theme = {
  id: string;
  nom: string;
  slug: string;
  description: string;
  icone: string;
  nombreQuestions: number;
};

export type Choix = { id: string; texte: string; estCorrecte?: boolean };

export type Question = {
  id: string;
  texte: string;
  theme: { id?: string; nom: string };
  choix: Choix[];
};

export type Match = {
  id: string;
  typeJeu?: string | null;
  statut: string;
  scoreHote: number;
  scoreInvite: number;
  tourActuel: number;
  scoreCible: number;
  termineLe?: string | null;
  creeLe?: string | null;
  commenceLe?: string | null;
  inviteAccepte?: boolean | null;
  premierTiersAtteint?: boolean;
  mise?: string | null;
  miseProposeeInvite?: string | null;
  miseEffective?: string | null;
  theme: { id: string; nom: string };
  joueurHote: Utilisateur;
  joueurInvite?: Utilisateur | null;
  vainqueur?: { id: string; pseudo: string } | null;
  tourEnCours?: {
    id: string;
    numero: number;
    statut: string;
    question: Question;
  } | null;
};

export type Publication = {
  id: string;
  texte: string;
  creeLe: string;
  auteur: Utilisateur;
  nombreReactions: number;
  nombreCommentaires: number;
  jaimeParMoi: boolean;
  lienType?: string;
  referenceId?: number;
};

export type LedgerEntry = {
  id: string;
  type: string;
  montant: string;
  reference: string;
  statut: string;
  creeLe: string;
};

export type Portefeuille = {
  soldeTotal: string;
  soldeRecharge: string;
  soldeBloque: string;
  soldeDisponible: string;
  soldeBloqueTotal: string;
  soldeGains: string;
  soldeGainsTotal: string;
  pinDefini: boolean;
  portefeuilleDeverrouille: boolean;
  modeDemo: boolean;
  rechargeDemoDisponible: boolean;
};

export type Pari = {
  id: string;
  montant: string;
  cote: string;
  statut: string;
  match: Match;
  joueurPari: Utilisateur;
  gainPotentiel?: string | null;
  creeLe: string;
};

export type RpsMatch = {
  id: string;
  joueurHoteId: string;
  joueurHotePseudo: string;
  joueurInviteId: string;
  joueurInvitePseudo: string;
  scoreHote: number;
  scoreInvite: number;
  scoreCible: number;
  round: number;
  statut: string;
};

export type DemandeAmi = {
  id: string;
  statut: string;
  demandeur: Utilisateur;
  receveur?: Utilisateur;
  creeLe: string;
};

export type MessageAmi = {
  id: string;
  contenu: string;
  creeLe: string;
  expediteur: Utilisateur;
  destinataire: Utilisateur;
};

export type UpdateProfilInput = {
  pseudo?: string;
  firstName?: string;
  lastName?: string;
  dateNaissance?: string;
  telephone?: string;
  villeOrigine?: string;
  photoProfil?: string;
  photoCouverture?: string;
};

export type Conversation = {
  type: "ami" | "groupe";
  identifiant: string;
  adversaire?: Utilisateur | null;
  ville?: { id: string; nom: string; slug: string } | null;
  dernierMessage: string;
  dernierExpediteur?: Utilisateur | null;
  dernierMessageHorodatage: string;
  nonLus: number;
};

const USER_FIELDS = `id pseudo email role firstName lastName villeOrigine telephone dateNaissance photoProfil photoCouverture enLigne dateJoined codeParrain isActive`;
const PORTEFEUILLE_FIELDS = `soldeTotal soldeRecharge soldeBloque soldeDisponible soldeBloqueTotal soldeGains soldeGainsTotal pinDefini portefeuilleDeverrouille modeDemo rechargeDemoDisponible`;
const MATCH_DETAIL = `
  id typeJeu statut scoreHote scoreInvite tourActuel scoreCible termineLe creeLe commenceLe inviteAccepte premierTiersAtteint mise miseProposeeInvite miseEffective
  theme { id nom }
  joueurHote { ${USER_FIELDS} }
  joueurInvite { ${USER_FIELDS} }
  vainqueur { id pseudo }
  tourEnCours { id numero statut question { id texte theme { nom } choix { id texte } } }
`;

const PUBLICATION_FIELDS = `id texte creeLe lienType referenceId auteur { ${USER_FIELDS} } nombreReactions nombreCommentaires jaimeParMoi`;

export type FinanceAdmin = {
  nombreJoueurs: number;
  soldeTotalDistribue: string;
  soldeDetenuParJoueurs: string;
  totalMise: string;
  totalGagne: string;
  totalPerdu: string;
  totalCommissions: string;
  capitalPlateforme: string;
  nombreMatchs: number;
  miseMoyenne: string;
  meilleurJoueur?: { id: string; pseudo: string; valeur: string; detail?: string | null } | null;
  meilleurGenerateurCommissions?: { id: string; pseudo: string; valeur: string; detail?: string | null } | null;
  nombreParis: number;
};

export const api = {
  login(identifiant: string, password: string) {
    return gql<{ login: { accessToken: string; refreshToken: string; utilisateur: Utilisateur } }>(
      `mutation($identifiant: String!, $password: String!) {
        login(email: $identifiant, password: $password) { accessToken refreshToken utilisateur { ${USER_FIELDS} } }
      }`,
      { identifiant, password },
      null,
    );
  },
  register(
    email: string,
    pseudo: string,
    password: string,
    firstName = "",
    lastName = "",
    dateNaissance = "",
    telephone = "",
    villeOrigine = "",
    photoProfil = "",
    photoCouverture = "",
  ) {
    return gql<{ register: { accessToken: string; refreshToken: string; utilisateur: Utilisateur } }>(
      `mutation($input: RegisterInput!) {
        register(input: $input) { accessToken refreshToken utilisateur { ${USER_FIELDS} } }
      }`,
      { input: { email, pseudo, password, firstName, lastName, dateNaissance, telephone, villeOrigine, photoProfil, photoCouverture } },
      null,
    );
  },
  moi() {
    return gql<{ moi: Utilisateur }>(`{ moi { ${USER_FIELDS} } }`);
  },
  pseudoInfo(pseudo: string) {
    return gql<{ pseudoInfo: { disponible: boolean; suggestion: string } }>(
      `query($pseudo: String!) { pseudoInfo(pseudo: $pseudo) { disponible suggestion } }`,
      { pseudo },
    );
  },
  profil() {
    return gql<{ profil: Profil }>(
      `{ profil { utilisateur { ${USER_FIELDS} } partiesJouees victoires defaites tauxReussite cumulGains } }`,
    );
  },
  updateProfil(input: UpdateProfilInput) {
    return gql<{ updateProfil: Utilisateur }>(
      `mutation($input: UpdateProfilInput!) {
        updateProfil(input: $input) { ${USER_FIELDS} }
      }`,
      {
        input: {
          pseudo: input.pseudo,
          firstName: input.firstName,
          lastName: input.lastName,
          dateNaissance: input.dateNaissance,
          telephone: input.telephone,
          villeOrigine: input.villeOrigine,
          photoProfil: input.photoProfil,
          photoCouverture: input.photoCouverture,
        },
      },
    );
  },
  statsPlateforme() {
    return gql<{ statsPlateforme: { joueurs: number; questions: number; joueursEnLigne: number; partiesEnCours: number } }>(
      `{ statsPlateforme { joueurs questions joueursEnLigne partiesEnCours } }`,
    );
  },
  classement(limit = 20) {
    return gql<{ classement: ClassementEntry[] }>(
      `query($limit: Int!) { classement(limit: $limit) { rang utilisateur { ${USER_FIELDS} } parties victoires defaites tauxReussite } }`,
      { limit },
    );
  },
  themes() {
    return gql<{ themes: Theme[] }>(`{ themes { id nom slug description icone nombreQuestions } }`);
  },
  villes() {
    return gql<{ villes: Array<{ id: string; nom: string; slug: string }> }>(
      `{ villes { id nom slug } }`,
    );
  },
  messagesSalon(villeSlug: string, limit = 10) {
    return gql<{ messagesSalon: Array<{ id: string; contenu: string; creeLe: string; utilisateur: { pseudo: string } }> }>(
      `query($villeSlug: String!, $limit: Int!) { messagesSalon(villeSlug: $villeSlug, limit: $limit) { id contenu creeLe utilisateur { pseudo } } }`,
      { villeSlug, limit },
    );
  },
  envoyerMessageVille(villeSlug: string, contenu: string) {
    return gql<{ envoyerMessageVille: { id: string; contenu: string; creeLe: string; utilisateur: { pseudo: string } } }>(
      `mutation($villeSlug: String!, $contenu: String!) { envoyerMessageVille(villeSlug: $villeSlug, contenu: $contenu) { id contenu creeLe utilisateur { pseudo } } }`,
      { villeSlug, contenu },
    );
  },
  messagesAmi(amiId: number, limit = 30) {
    return gql<{ messagesAmi: MessageAmi[] }>(
      `query($amiId: Int!, $limit: Int!) { messagesAmi(amiId: $amiId, limit: $limit) { id contenu creeLe expediteur { ${USER_FIELDS} } destinataire { ${USER_FIELDS} } } }`,
      { amiId, limit },
    );
  },
  envoyerMessageAmi(amiId: number, contenu: string) {
    return gql<{ envoyerMessageAmi: MessageAmi }>(
      `mutation($amiId: Int!, $contenu: String!) { envoyerMessageAmi(amiId: $amiId, contenu: $contenu) { id contenu creeLe expediteur { ${USER_FIELDS} } destinataire { ${USER_FIELDS} } } }`,
      { amiId, contenu },
    );
  },
  nbMessagesNonLus() {
    return gql<{ nbMessagesNonLus: number }>(`{ nbMessagesNonLus }`);
  },
  discussions() {
    return gql<{ discussions: Conversation[] }>(
      `{ discussions { type identifiant dernierMessage dernierMessageHorodatage nonLus adversaire { ${USER_FIELDS} } dernierExpediteur { ${USER_FIELDS} } ville { id nom slug } } }`,
    );
  },
  marquerMessagesLus(amiId: number) {
    return gql<{ marquerMessagesLus: boolean }>(`mutation($amiId: Int!) { marquerMessagesLus(amiId: $amiId) }`, { amiId });
  },
  questions(themeId: number, limit = 50) {
    return gql<{ questions: Question[] }>(
      `query($themeId: Int!, $limit: Int!) {
        questions(themeId: $themeId, limit: $limit) { id texte theme { id nom } choix { id texte estCorrecte } }
      }`,
      { themeId, limit },
    );
  },
  createQuestion(themeId: number, texte: string, reponses: { texte: string; estCorrecte: boolean }[]) {
    return gql<{ createQuestion: Question }>(
      `mutation($themeId: Int!, $texte: String!, $reponses: [ReponseInput!]!) {
        createQuestion(themeId: $themeId, texte: $texte, reponses: $reponses) {
          id texte theme { id nom } choix { id texte estCorrecte }
        }
      }`,
      { themeId, texte, reponses },
    );
  },
  updateQuestion(questionId: number, texte: string, reponses: { texte: string; estCorrecte: boolean }[]) {
    return gql<{ updateQuestion: Question }>(
      `mutation($questionId: Int!, $texte: String!, $reponses: [ReponseInput!]!) {
        updateQuestion(questionId: $questionId, texte: $texte, reponses: $reponses) {
          id texte theme { id nom } choix { id texte estCorrecte }
        }
      }`,
      { questionId, texte, reponses },
    );
  },
  deleteQuestion(questionId: number) {
    return gql<{ deleteQuestion: boolean }>(
      `mutation($questionId: Int!) { deleteQuestion(questionId: $questionId) }`,
      { questionId },
    );
  },
  reponseCorrecte(reponseId: number) {
    return gql<{ reponseCorrecte: boolean }>(
      `query($id: Int!) { reponseCorrecte(reponseId: $id) }`,
      { id: reponseId },
    );
  },
  partiesDisponibles() {
    return gql<{ partiesDisponibles: Match[] }>(
      `{ partiesDisponibles { ${MATCH_DETAIL} } }`,
    );
  },
  partiesEnCours() {
    return gql<{ partiesEnCours: Match[] }>(
      `{ partiesEnCours { ${MATCH_DETAIL} } }`,
    );
  },
  mesParties() {
    return gql<{ mesParties: Match[] }>(
      `{ mesParties { ${MATCH_DETAIL} } }`,
    );
  },
  matchParId(matchId: number) {
    return gql<{ matchParId: Match | null }>(
      `query($id: Int!) { matchParId(matchId: $id) { ${MATCH_DETAIL} } }`,
      { id: matchId },
    );
  },
  creerPartie(themeId: number, scoreCible = 8, typeJeu = "classique", mise: number | null = null) {
    return gql<{ creerPartie: Match }>(
      `mutation($themeId: Int!, $scoreCible: Int!, $typeJeu: String!, $mise: Decimal!) { creerPartie(themeId: $themeId, scoreCible: $scoreCible, typeJeu: $typeJeu, mise: $mise) { ${MATCH_DETAIL} } }`,
      { themeId, scoreCible, typeJeu, mise: mise || 0 },
    );
  },
  annulerPartie(matchId: number) {
    return gql<{ annulerPartie: boolean }>(`mutation($id: Int!) { annulerPartie(matchId: $id) }`, { id: matchId });
  },
  inviterJoueurCourseLapin(matchId: number, inviteId: number) {
    return gql<{ inviterJoueurCourseLapin: Match }>(
      `mutation($matchId: Int!, $inviteId: Int!) { inviterJoueurCourseLapin(matchId: $matchId, inviteId: $inviteId) { ${MATCH_DETAIL} } }`,
      { matchId, inviteId },
    );
  },
  accepterInvitationCourseLapin(matchId: number) {
    return gql<{ accepterInvitationCourseLapin: Match }>(
      `mutation($matchId: Int!) { accepterInvitationCourseLapin(matchId: $matchId) { ${MATCH_DETAIL} } }`,
      { matchId },
    );
  },
  refuserInvitationCourseLapin(matchId: number) {
    return gql<{ refuserInvitationCourseLapin: Match }>(
      `mutation($matchId: Int!) { refuserInvitationCourseLapin(matchId: $matchId) { ${MATCH_DETAIL} } }`,
      { matchId },
    );
  },
  lancerCourseLapin(matchId: number) {
    return gql<{ lancerCourseLapin: Match }>(
      `mutation($matchId: Int!) { lancerCourseLapin(matchId: $matchId) { ${MATCH_DETAIL} } }`,
      { matchId },
    );
  },
  rejoindrePartie(matchId: number, mise: number | null = null) {
    return gql<{ rejoindrePartie: Match }>(
      `mutation($id: Int!, $mise: Decimal) { rejoindrePartie(matchId: $id, mise: $mise) { ${MATCH_DETAIL} } }`,
      { id: matchId, mise: mise || null },
    );
  },
  mesDefisRps() {
    return gql<{ mesDefisRps: Array<{ id: string; fromId: string; fromPseudo: string; toId: string; toPseudo?: string | null; created: string }> }>(
      `{ mesDefisRps { id fromId fromPseudo toId toPseudo created } }`,
    );
  },
  mesDefisPenalty() {
    return gql<{ mesDefisPenalty: Array<{ id: string; hoteId: string; hotePseudo: string; inviteId: string; invitePseudo?: string | null; scoreCible: number; statut: string }> }>(
      `{ mesDefisPenalty { id hoteId hotePseudo inviteId invitePseudo scoreCible statut } }`,
    );
  },
  mesMatchsRps() {
    return gql<{ mesMatchsRps: Array<{ id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string }> }>(
      `{ mesMatchsRps { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut } }`,
    );
  },
  partiesRpsDisponibles() {
    return gql<{ partiesRpsDisponibles: Array<{ id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string }> }>(
      `{ partiesRpsDisponibles { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut } }`,
    );
  },
  defierJoueurRps(inviteId: number, scoreCible = 3) {
    return gql<{ defierJoueurRps: { id: string; fromId: string; toId: string; fromPseudo: string; toPseudo?: string | null; scoreCible: number; created: string } }>(
      `mutation($inviteId: Int!, $scoreCible: Int!) { defierJoueurRps(inviteId: $inviteId, scoreCible: $scoreCible) { id fromId toId fromPseudo toPseudo scoreCible created } }`,
      { inviteId, scoreCible },
    );
  },
  accepterDefiRps(challengeId: string) {
    return gql<{ accepterDefiRps: { id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string } }>(
      `mutation($challengeId: ID!) { accepterDefiRps(challengeId: $challengeId) { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut } }`,
      { challengeId },
    );
  },
  demarrerRevancheRps(matchId: string) {
    return gql<{ demarrerRevancheRps: { id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string } }>(
      `mutation($matchId: String!) { demarrerRevancheRps(matchId: $matchId) { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut } }`,
      { matchId },
    );
  },
  supprimerMatchRps(matchId: string) {
    return gql<{ supprimerMatchRps: boolean }>(
      `mutation($matchId: String!) { supprimerMatchRps(matchId: $matchId) }`,
      { matchId },
    );
  },
  jouerCoupRps(matchId: string, coup: "pierre" | "papier" | "ciseaux") {
    return gql<{ jouerCoupRps: { id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string; resultatManche?: string | null } }>(
      `mutation($matchId: String!, $coup: String!) { jouerCoupRps(matchId: $matchId, coup: $coup) { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut resultatManche } }`,
      { matchId, coup },
    );
  },
  defierJoueurPenalty(inviteId: string, scoreCible: number = 5) {
    return gql<{ defierJoueurPenalty: { id: string; hoteId: string; hotePseudo: string; inviteId: string; invitePseudo: string; scoreCible: number; statut: string } }>(
      `mutation($data: PenaltyMatchInput!) { defierJoueurPenalty(data: $data) { id hoteId hotePseudo inviteId invitePseudo scoreCible statut } }`,
      { data: { inviteId, scoreCible } },
    );
  },
  accepterDefiPenalty(challengeId: string) {
    return gql<{ accepterDefiPenalty: { id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string; resultatManche?: string | null; vainqueurId?: string | null } }>(
      `mutation($challengeId: String!) { accepterDefiPenalty(challengeId: $challengeId) { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut resultatManche vainqueurId } }`,
      { challengeId },
    );
  },
  jouerTirPenalty(matchId: string, direction: "gauche" | "centre" | "droite") {
    return gql<{ jouerTirPenalty: { id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string; resultatManche?: string | null; vainqueurId?: string | null } }>(
      `mutation($matchId: String!, $direction: String!) { jouerTirPenalty(matchId: $matchId, direction: $direction) { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut resultatManche vainqueurId } }`,
      { matchId, direction },
    );
  },
  demarrerRevanchePenalty(matchId: string) {
    return gql<{ demarrerRevanchePenalty: { id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string; resultatManche?: string | null; vainqueurId?: string | null } }>(
      `mutation($matchId: String!) { demarrerRevanchePenalty(matchId: $matchId) { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut resultatManche vainqueurId } }`,
      { matchId },
    );
  },
  supprimerMatchPenalty(matchId: string) {
    return gql<{ supprimerMatchPenalty: boolean }>(
      `mutation($matchId: String!) { supprimerMatchPenalty(matchId: $matchId) }`,
      { matchId },
    );
  },
  mesMatchsPenalty() {
    return gql<{ mesMatchsPenalty: { id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string; resultatManche?: string | null; vainqueurId?: string | null }[] }>(
      `{ mesMatchsPenalty { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut resultatManche vainqueurId } }`,
    );
  },
  partiesPenaltyDisponibles() {
    return gql<{ partiesPenaltyDisponibles: { id: string; joueurHoteId: string; joueurHotePseudo: string; joueurInviteId: string; joueurInvitePseudo: string; scoreHote: number; scoreInvite: number; scoreCible: number; round: number; statut: string; resultatManche?: string | null; vainqueurId?: string | null }[] }>(
      `{ partiesPenaltyDisponibles { id joueurHoteId joueurHotePseudo joueurInviteId joueurInvitePseudo scoreHote scoreInvite scoreCible round statut resultatManche vainqueurId } }`,
    );
  },
  soumettreReponse(tourId: number, reponseId: number) {
    return gql<{ soumettreReponse: boolean }>(
      `mutation($tourId: Int!, $reponseId: Int!) { soumettreReponse(tourId: $tourId, reponseId: $reponseId) }`,
      { tourId, reponseId },
    );
  },
  filActualite() {
    return gql<{ filActualite: Publication[] }>(
      `{ filActualite { ${PUBLICATION_FIELDS} } }`,
    );
  },
  publier(texte: string) {
    return gql<{ publier: Publication }>(
      `mutation($texte: String!) {
        publier(texte: $texte) { ${PUBLICATION_FIELDS} }
      }`,
      { texte },
    );
  },
  aimerPublication(publicationId: number) {
    return gql<{ aimerPublication: boolean }>(
      `mutation($id: Int!) { aimerPublication(publicationId: $id) }`,
      { id: publicationId },
    );
  },
  commenter(publicationId: number, texte: string) {
    return gql<{ commenter: boolean }>(
      `mutation($id: Int!, $texte: String!) { commenter(publicationId: $id, texte: $texte) }`,
      { id: publicationId, texte },
    );
  },
  mesAmis() {
    return gql<{ mesAmis: Utilisateur[] }>(`{ mesAmis { ${USER_FIELDS} } }`);
  },
  mesNotifications(limit = 20) {
    return gql<{ mesNotifications: Array<{ id: string; type: string; titre: string; message: string; lu: boolean; referenceId: number; creeLe: string; expediteur?: Utilisateur | null }> }>(
      `query($limit: Int!) { mesNotifications(limit: $limit) { id type titre message lu referenceId creeLe expediteur { ${USER_FIELDS} } } }`,
      { limit },
    );
  },
  marquerNotificationLue(notificationId: number) {
    return gql<{ marquerNotificationLue: boolean }>(
      `mutation($id: Int!) { marquerNotificationLue(notificationId: $id) }`,
      { id: notificationId },
    );
  },
  marquerToutesNotificationsLues() {
    return gql<{ marquerToutesNotificationsLues: boolean }>(
      `mutation { marquerToutesNotificationsLues }`,
    );
  },
  demandesAmisRecues() {
    return gql<{ demandesAmisRecues: DemandeAmi[] }>(
      `{ demandesAmisRecues { id statut creeLe demandeur { ${USER_FIELDS} } } }`,
    );
  },
  demandesAmisEnvoyees() {
    return gql<{ demandesAmisEnvoyees: DemandeAmi[] }>(
      `{ demandesAmisEnvoyees { id statut creeLe receveur { ${USER_FIELDS} } } }`,
    );
  },
  repondreDemandeAmi(demandeId: number, accepter: boolean) {
    return gql<{ repondreDemandeAmi: boolean }>(
      `mutation($id: Int!, $accepter: Boolean!) { repondreDemandeAmi(demandeId: $id, accepter: $accepter) }`,
      { id: demandeId, accepter },
    );
  },
  envoyerDemandeAmi(pseudo: string) {
    return gql<{ envoyerDemandeAmi: boolean }>(
      `mutation($pseudo: String!) { envoyerDemandeAmi(pseudo: $pseudo) }`,
      { pseudo },
    );
  },
  monPortefeuille() {
    return gql<{ monPortefeuille: Portefeuille }>(
      `{ monPortefeuille { ${PORTEFEUILLE_FIELDS} } }`,
    );
  },
  definirPinPortefeuille(pin: string, pinConfirmation: string) {
    return gql<{ definirPinPortefeuille: Portefeuille }>(
      `mutation($pin: String!, $pinConfirmation: String!) { definirPinPortefeuille(pin: $pin, pinConfirmation: $pinConfirmation) { ${PORTEFEUILLE_FIELDS} } }`,
      { pin, pinConfirmation },
    );
  },
  changerPinPortefeuille(pinActuel: string, pin: string, pinConfirmation: string) {
    return gql<{ changerPinPortefeuille: Portefeuille }>(
      `mutation($pinActuel: String!, $pin: String!, $pinConfirmation: String!) { changerPinPortefeuille(pinActuel: $pinActuel, pin: $pin, pinConfirmation: $pinConfirmation) { ${PORTEFEUILLE_FIELDS} } }`,
      { pinActuel, pin, pinConfirmation },
    );
  },
  deverrouillerPortefeuille(pin: string) {
    return gql<{ deverrouillerPortefeuille: Portefeuille }>(
      `mutation($pin: String!) { deverrouillerPortefeuille(pin: $pin) { ${PORTEFEUILLE_FIELDS} } }`,
      { pin },
    );
  },
  verrouillerPortefeuille() {
    return gql<{ verrouillerPortefeuille: Portefeuille }>(
      `mutation { verrouillerPortefeuille { ${PORTEFEUILLE_FIELDS} } }`,
    );
  },
  rechargerPortefeuille(idempotencyKey: string) {
    return gql<{ rechargerPortefeuille: Portefeuille }>(
      `mutation($idempotencyKey: String!) { rechargerPortefeuille(idempotencyKey: $idempotencyKey) { ${PORTEFEUILLE_FIELDS} } }`,
      { idempotencyKey },
    );
  },
  historiqueTransactions() {
    return gql<{ historiqueTransactions: LedgerEntry[] }>(
      `{ historiqueTransactions { id type montant reference statut creeLe } }`,
    );
  },
  utilisateurs(recherche?: string) {
    return gql<{ utilisateurs: Utilisateur[] }>(
      `query($recherche: String) { utilisateurs(recherche: $recherche) { ${USER_FIELDS} } }`,
      { recherche: recherche || null },
    );
  },
  changerRole(utilisateurId: string, role: "ADMIN" | "JOUEUR") {
    return gql<{ changerRole: Utilisateur }>(
      `mutation($id: ID!, $role: String!) { changerRole(utilisateurId: $id, role: $role) { ${USER_FIELDS} } }`,
      { id: utilisateurId, role },
    );
  },
  desactiverUtilisateur(utilisateurId: string) {
    return gql<{ desactiverUtilisateur: Utilisateur }>(
      `mutation($id: ID!) { desactiverUtilisateur(utilisateurId: $id) { ${USER_FIELDS} } }`,
      { id: utilisateurId },
    );
  },
  activerUtilisateur(utilisateurId: string) {
    return gql<{ activerUtilisateur: Utilisateur }>(
      `mutation($id: ID!) { activerUtilisateur(utilisateurId: $id) { ${USER_FIELDS} } }`,
      { id: utilisateurId },
    );
  },
  supprimerUtilisateur(utilisateurId: string) {
    return gql<{ supprimerUtilisateur: boolean }>(
      `mutation($id: ID!) { supprimerUtilisateur(utilisateurId: $id) }`,
      { id: utilisateurId },
    );
  },
  placerPari(matchId: number, joueurId: number, montant: number, idempotencyKey = "") {
    return gql<{ placerPari: Pari }>(
      `mutation($matchId: Int!, $joueurId: Int!, $montant: Decimal!, $idempotencyKey: String) {
        placerPari(matchId: $matchId, joueurId: $joueurId, montant: $montant, idempotencyKey: $idempotencyKey) {
          id montant cote statut gainPotentiel creeLe
          match { id statut scoreHote scoreInvite scoreCible theme { nom } joueurHote { ${USER_FIELDS} } joueurInvite { ${USER_FIELDS} } }
          joueurPari { ${USER_FIELDS} }
        }
      }`,
      { matchId, joueurId, montant, idempotencyKey },
    );
  },
  mesParis(limit = 20) {
    return gql<{ mesParis: Pari[] }>(
      `query($limit: Int!) { mesParis(limit: $limit) { id montant cote statut gainPotentiel creeLe match { id statut scoreHote scoreInvite } joueurPari { ${USER_FIELDS} } } }`,
      { limit },
    );
  },
  parisMatch(matchId: number, limit = 50) {
    return gql<{ parisMatch: Pari[] }>(
      `query($matchId: Int!, $limit: Int!) { parisMatch(matchId: $matchId, limit: $limit) { id montant cote statut gainPotentiel creeLe match { id statut } joueurPari { ${USER_FIELDS} } } }`,
      { matchId, limit },
    );
  },
  financeAdmin(depuis?: string, jusquA?: string) {
    return gql<{ financeAdmin: FinanceAdmin }>(
      `query($depuis: Date, $jusquA: Date) {
        financeAdmin(depuis: $depuis, jusquA: $jusquA) {
          nombreJoueurs soldeTotalDistribue soldeDetenuParJoueurs totalMise totalGagne totalPerdu
          totalCommissions capitalPlateforme nombreMatchs miseMoyenne nombreParis
          meilleurJoueur { id pseudo valeur detail }
          meilleurGenerateurCommissions { id pseudo valeur detail }
        }
      }`,
      { depuis: depuis || null, jusquA: jusquA || null },
    );
  },
};
