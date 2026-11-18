import { describe, it, expect } from "vitest";
import {
  PublicationStatus,
  canTransition,
  assertTransition,
  transitionsFrom,
  isTerminal,
  InvalidTransitionError,
} from "../src/domain/publication-state";

const {
  DRAFT, APPROVED, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, RETRYING, CANCELLED,
} = PublicationStatus;

describe("fluxo feliz", () => {
  it("percorre DRAFT → APPROVED → SCHEDULED → PUBLISHING → PUBLISHED", () => {
    expect(canTransition(DRAFT, APPROVED)).toBe(true);
    expect(canTransition(APPROVED, SCHEDULED)).toBe(true);
    expect(canTransition(SCHEDULED, PUBLISHING)).toBe(true);
    expect(canTransition(PUBLISHING, PUBLISHED)).toBe(true);
  });

  it("não deixa pular a aprovação — criar não é aprovar", () => {
    expect(canTransition(DRAFT, SCHEDULED)).toBe(false);
    expect(canTransition(DRAFT, PUBLISHING)).toBe(false);
    expect(canTransition(DRAFT, PUBLISHED)).toBe(false);
  });
});

describe("fluxo de falha", () => {
  it("percorre PUBLISHING → FAILED → RETRYING → PUBLISHING", () => {
    expect(canTransition(PUBLISHING, FAILED)).toBe(true);
    expect(canTransition(FAILED, RETRYING)).toBe(true);
    expect(canTransition(RETRYING, PUBLISHING)).toBe(true);
  });

  it("deixa reagendar ou cancelar uma publicação que falhou", () => {
    expect(canTransition(FAILED, SCHEDULED)).toBe(true);
    expect(canTransition(FAILED, CANCELLED)).toBe(true);
  });
});

describe("cancelamento", () => {
  it("cancela do rascunho até o agendamento", () => {
    for (const de of [DRAFT, APPROVED, SCHEDULED, FAILED, RETRYING]) {
      expect(canTransition(de, CANCELLED)).toBe(true);
    }
  });

  it("não cancela o que já está publicando — o publish já está em voo", () => {
    expect(canTransition(PUBLISHING, CANCELLED)).toBe(false);
  });

  it("reabre um cancelado como rascunho", () => {
    expect(canTransition(CANCELLED, DRAFT)).toBe(true);
  });
});

describe("PUBLISHED é terminal", () => {
  it("não sai de PUBLISHED por nenhum caminho", () => {
    expect(transitionsFrom(PUBLISHED)).toEqual([]);
    expect(isTerminal(PUBLISHED)).toBe(true);
  });

  // O bug que motivou o sistema: metadados falharam, alguém tenta republicar.
  it("nunca volta de PUBLISHED para PUBLISHING, FAILED ou RETRYING", () => {
    expect(canTransition(PUBLISHED, PUBLISHING)).toBe(false);
    expect(canTransition(PUBLISHED, FAILED)).toBe(false);
    expect(canTransition(PUBLISHED, RETRYING)).toBe(false);
  });
});

describe("assertTransition", () => {
  it("passa numa transição válida", () => {
    expect(() => assertTransition(DRAFT, APPROVED)).not.toThrow();
  });

  it("lança InvalidTransitionError numa inválida, dizendo de onde pra onde", () => {
    expect(() => assertTransition(PUBLISHED, PUBLISHING)).toThrow(InvalidTransitionError);
    expect(() => assertTransition(PUBLISHED, PUBLISHING)).toThrow(/PUBLISHED.*PUBLISHING/);
  });
});

describe("invariantes gerais", () => {
  it("nenhum estado transiciona pra si mesmo (reagendar é SCHEDULED→SCHEDULED? não: é uma edição)", () => {
    for (const estado of Object.values(PublicationStatus)) {
      expect(canTransition(estado, estado)).toBe(false);
    }
  });

  it("só o worker chega em PUBLISHING, e só de SCHEDULED ou RETRYING", () => {
    const entram = Object.values(PublicationStatus).filter((s) => canTransition(s, PUBLISHING));
    expect(entram.sort()).toEqual([RETRYING, SCHEDULED].sort());
  });

  it("só PUBLISHING chega em PUBLISHED", () => {
    const entram = Object.values(PublicationStatus).filter((s) => canTransition(s, PUBLISHED));
    expect(entram).toEqual([PUBLISHING]);
  });
});
