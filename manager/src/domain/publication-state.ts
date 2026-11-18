/**
 * Máquina de estados da publicação.
 *
 * Regra fundamental do sistema: aprovar e agendar são atos diferentes.
 * Criar uma publicação nunca a torna publicável — ela precisa passar por
 * APPROVED e depois por SCHEDULED, cada um com uma ação humana explícita.
 *
 * PUBLISHED é terminal por decisão de projeto, não por conveniência: uma
 * publicação que já foi aceita pela plataforma não pode voltar pra fila por
 * causa de uma falha posterior (metadados, permalink, sync). Ver docs/publishing.md.
 */

export const PublicationStatus = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  SCHEDULED: "SCHEDULED",
  PUBLISHING: "PUBLISHING",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
  RETRYING: "RETRYING",
  CANCELLED: "CANCELLED",
} as const;

export type PublicationStatus = (typeof PublicationStatus)[keyof typeof PublicationStatus];

const { DRAFT, APPROVED, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, RETRYING, CANCELLED } =
  PublicationStatus;

const TRANSICOES: Record<PublicationStatus, PublicationStatus[]> = {
  [DRAFT]: [APPROVED, CANCELLED],
  [APPROVED]: [SCHEDULED, DRAFT, CANCELLED],
  // Reagendar não é transição: é editar scheduledAt dentro de SCHEDULED.
  [SCHEDULED]: [PUBLISHING, APPROVED, CANCELLED],
  // Uma vez em voo, só o worker decide o desfecho — nem cancelar interrompe.
  [PUBLISHING]: [PUBLISHED, FAILED],
  [PUBLISHED]: [],
  [FAILED]: [RETRYING, SCHEDULED, CANCELLED],
  [RETRYING]: [PUBLISHING, CANCELLED],
  // Reabrir um cancelado devolve pro rascunho: reaprovar e reagendar do zero.
  [CANCELLED]: [DRAFT],
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly de: PublicationStatus,
    readonly para: PublicationStatus,
  ) {
    super(`Transição inválida: ${de} → ${para}. Permitidas a partir de ${de}: ${
      TRANSICOES[de].join(", ") || "(nenhuma, estado terminal)"
    }`);
    this.name = "InvalidTransitionError";
  }
}

export function transitionsFrom(de: PublicationStatus): PublicationStatus[] {
  return [...TRANSICOES[de]];
}

export function canTransition(de: PublicationStatus, para: PublicationStatus): boolean {
  return TRANSICOES[de].includes(para);
}

export function assertTransition(de: PublicationStatus, para: PublicationStatus): void {
  if (!canTransition(de, para)) throw new InvalidTransitionError(de, para);
}

export function isTerminal(estado: PublicationStatus): boolean {
  return TRANSICOES[estado].length === 0;
}

/** Estados que o worker pode considerar elegíveis pra execução. */
export const STATUS_ELEGIVEIS: PublicationStatus[] = [SCHEDULED, RETRYING];

/** Estados em que a publicação ainda não chegou ao fim da vida. */
export const STATUS_ABERTOS: PublicationStatus[] = [
  DRAFT, APPROVED, SCHEDULED, PUBLISHING, FAILED, RETRYING,
];
