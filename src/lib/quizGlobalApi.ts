import { gql } from "./graphql";

export type QuizGlobalTheme = {
  id: number;
  nom: string;
  icone: string;
  remaining: number;
  selectable: boolean;
};

export type QuizGlobalPlayerView = {
  id: string;
  pseudo: string;
  seat: string;
  score: number;
};

export type QuizGlobalQuestionView = {
  id: number;
  turnNumber: number;
  theme: string;
  question: string;
  isTieBreak: boolean;
  options?: { A: string; B: string; C: string; D: string } | null;
  correctOption?: string | null;
  correctText?: string | null;
};

export type QuizGlobalState = {
  gameId: number;
  status: string;
  targetQuestions: number;
  currentTurn: number;
  activeSeat: string;
  isTieBreak: boolean;
  phaseStartedAt?: string | null;
  phaseDeadline?: string | null;
  serverTime: string;
  serverOffset?: number;
  themes: QuizGlobalTheme[];
  playerA?: QuizGlobalPlayerView | null;
  playerB?: QuizGlobalPlayerView | null;
  invitedPlayer?: QuizGlobalPlayerView | null;
  winnerId?: string | null;
  question?: QuizGlobalQuestionView | null;
  myAnswer?: { selectedOption: string; status: string; pointsAwarded?: number | null } | null;
  mySeat?: string | null;
  results?: Array<{
    seat: string;
    pseudo: string;
    selectedOption?: string | null;
    isCorrect: boolean;
    pointsAwarded: number;
  }> | null;
};

const STATE = `
  gameId status targetQuestions currentTurn activeSeat isTieBreak
  phaseStartedAt phaseDeadline serverTime mySeat winnerId
  themes { id nom icone remaining selectable }
  playerA { id pseudo seat score }
  playerB { id pseudo seat score }
  invitedPlayer { id pseudo seat score }
  question { id turnNumber theme question isTieBreak correctOption correctText options { A B C D } }
  myAnswer { selectedOption status pointsAwarded }
  results { seat pseudo selectedOption isCorrect pointsAwarded }
`;

export const quizGlobalApi = {
  creer(targetQuestions: number, inviteId?: number) {
    return gql<{ creerPartieQuizGlobal: QuizGlobalState }>(
      `mutation($n: Int!, $inviteId: Int) {
        creerPartieQuizGlobal(targetQuestions: $n, inviteId: $inviteId) { ${STATE} }
      }`,
      { n: targetQuestions, inviteId: inviteId ?? null },
    );
  },
  rejoindre(gameId: number) {
    return gql<{ rejoindrePartieQuizGlobal: QuizGlobalState }>(
      `mutation($id: Int!) { rejoindrePartieQuizGlobal(gameId: $id) { ${STATE} } }`,
      { id: gameId },
    );
  },
  get(gameId: number) {
    return gql<{ partieQuizGlobal: QuizGlobalState }>(
      `query($id: Int!) { partieQuizGlobal(gameId: $id) { ${STATE} } }`,
      { id: gameId },
    );
  },
  disponibles() {
    return gql<{ partiesQuizGlobalDisponibles: QuizGlobalState[] }>(
      `{ partiesQuizGlobalDisponibles { ${STATE} } }`,
    );
  },
  mesParties() {
    return gql<{ mesPartiesQuizGlobal: QuizGlobalState[] }>(
      `{ mesPartiesQuizGlobal { ${STATE} } }`,
    );
  },
  mesInvitations() {
    return gql<{ mesInvitationsQuizGlobal: QuizGlobalState[] }>(
      `{ mesInvitationsQuizGlobal { ${STATE} } }`,
    );
  },
  annuler(gameId: number) {
    return gql<{ annulerPartieQuizGlobal: boolean }>(
      `mutation($id: Int!) { annulerPartieQuizGlobal(gameId: $id) }`,
      { id: gameId },
    );
  },
  refuserInvitation(gameId: number) {
    return gql<{ refuserInvitationQuizGlobal: boolean }>(
      `mutation($id: Int!) { refuserInvitationQuizGlobal(gameId: $id) }`,
      { id: gameId },
    );
  },
  choisirTheme(gameId: number, themeId: number) {
    return gql<{ choisirThemeQuizGlobal: QuizGlobalState }>(
      `mutation($id: Int!, $themeId: Int!) {
        choisirThemeQuizGlobal(gameId: $id, themeId: $themeId) { ${STATE} }
      }`,
      { id: gameId, themeId },
    );
  },
  repondre(gameId: number, gameQuestionId: number, selectedOption: string) {
    return gql<{ repondreQuizGlobal: { ok: boolean; status: string } }>(
      `mutation($id: Int!, $qid: Int!, $opt: String!) {
        repondreQuizGlobal(gameId: $id, gameQuestionId: $qid, selectedOption: $opt) { ok status }
      }`,
      { id: gameId, qid: gameQuestionId, opt: selectedOption },
    );
  },
  avancer(gameId: number) {
    return gql<{ avancerPhaseQuizGlobal: QuizGlobalState }>(
      `mutation($id: Int!) { avancerPhaseQuizGlobal(gameId: $id) { ${STATE} } }`,
      { id: gameId },
    );
  },
  revanche(gameId: number) {
    return gql<{ revanchePartieQuizGlobal: QuizGlobalState }>(
      `mutation($id: Int!) { revanchePartieQuizGlobal(gameId: $id) { ${STATE} } }`,
      { id: gameId },
    );
  },
};
