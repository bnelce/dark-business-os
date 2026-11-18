import { cookies } from "next/headers";
import { obrigatorio, opcional } from "./env";
import { senhaConfere } from "./crypto";
import { criarSessao, lerSessao, NOME_DO_COOKIE, DURACAO_HORAS, type Sessao } from "./sessao";

/**
 * Autenticação de usuário único.
 *
 * Não existe cadastro, convite, equipe nem papel: um operador, credenciais no
 * ambiente. A sessão é um JWT assinado num cookie httpOnly — sem tabela de
 * sessão, sem estado pra sincronizar entre o app e o worker.
 *
 * Este módulo usa node:crypto e por isso NÃO pode ser importado pelo
 * middleware; ele importa lib/sessao.ts diretamente.
 */

export { criarSessao, lerSessao, NOME_DO_COOKIE, type Sessao };

export async function sessaoAtual(): Promise<Sessao | null> {
  return lerSessao((await cookies()).get(NOME_DO_COOKIE)?.value);
}

/**
 * Guarda das ações e rotas administrativas. Toda server action que muda estado
 * chama isto antes de qualquer coisa — o middleware protege navegação, não POST.
 */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await sessaoAtual();
  if (!sessao) throw new Error("Não autenticado");
  return sessao;
}

export async function gravarCookieDeSessao(token: string): Promise<void> {
  (await cookies()).set(NOME_DO_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_HORAS * 3600,
  });
}

export async function limparSessao(): Promise<void> {
  (await cookies()).delete(NOME_DO_COOKIE);
}

// ------------------------------------------------------------ credenciais

export function conferirCredenciais(usuario: string, senha: string): boolean {
  const usuarioEsperado = obrigatorio("ADMIN_USERNAME");
  const senhaEsperada = obrigatorio("ADMIN_PASSWORD");
  // Confere as duas sempre, sem curto-circuito: o tempo de resposta não pode
  // revelar se o usuário existe.
  const usuarioOk = senhaConfere(usuario, usuarioEsperado);
  const senhaOk = senhaConfere(senha, senhaEsperada);
  return usuarioOk && senhaOk;
}

// ------------------------------------------------------------ freio de força bruta

type Tentativa = { contagem: number; bloqueadoAte: number };
const tentativas = new Map<string, Tentativa>();

const LIMITE = Number(opcional("LOGIN_MAX_TENTATIVAS", "5"));
const JANELA_MS = 15 * 60_000;

/**
 * Freio simples em memória. Um processo, um operador — não vale a pena um
 * Redis pra isso. Reiniciar o app zera o freio, o que é aceitável aqui.
 */
export function registrarTentativaFalha(chave: string, agora = Date.now()): void {
  const atual = tentativas.get(chave);
  if (!atual || agora > atual.bloqueadoAte) {
    tentativas.set(chave, { contagem: 1, bloqueadoAte: agora + JANELA_MS });
    return;
  }
  atual.contagem += 1;
  if (atual.contagem >= LIMITE) atual.bloqueadoAte = agora + JANELA_MS;
}

export function estaBloqueado(chave: string, agora = Date.now()): { bloqueado: boolean; segundos: number } {
  const atual = tentativas.get(chave);
  if (!atual) return { bloqueado: false, segundos: 0 };
  if (agora > atual.bloqueadoAte) {
    tentativas.delete(chave);
    return { bloqueado: false, segundos: 0 };
  }
  if (atual.contagem < LIMITE) return { bloqueado: false, segundos: 0 };
  return { bloqueado: true, segundos: Math.ceil((atual.bloqueadoAte - agora) / 1000) };
}

export function limparTentativas(chave: string): void {
  tentativas.delete(chave);
}
