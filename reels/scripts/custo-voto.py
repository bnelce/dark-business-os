# Conta do reel "Quanto custou cada voto" (ciencia/CustoVoto): gasto de campanha por voto dos
# candidatos a deputado federal em 2026, com dados abertos do TSE.
#
#   python3 -I reels/scripts/custo-voto.py <pasta dados> <saída.json>
#
# Os zips do TSE são dados não confiáveis: este script fica fora da pasta, roda com -I e só lê
# os zips em fluxo (nada é extraído no disco). Lê:
#   consulta_cand_2026.zip                          candidatos (partido, situação de totalização)
#   votacao_candidato_munzona_2026.zip              votos nominais por município e zona (CSV de cada UF)
#   prestacao_de_contas_eleitorais_candidatos_2026.zip
#       receitas_candidatos_2026_BRASIL.csv         receitas por fonte (FEFC, Fundo Partidário, outros)
#       despesas_contratadas_candidatos_2026_BRASIL.csv
#       despesas_pagas_candidatos_2026_BRASIL.csv   (pagamentos por fonte, quando o arquivo traz a coluna)
#
# Gasto = soma das despesas contratadas declaradas. Gasto por voto = gasto ÷ votos nominais válidos.
# Dinheiro público = receitas de fonte FUNDO ESPECIAL (FEFC) + FUNDO PARTIDARIO. Tudo por
# SQ_CANDIDATO; nenhum CPF é lido nem guardado.
# Também lê <dados>/resultados-json/<uf>-c0006-e006259-u.json (resultado oficial por UF, resultados.tse.jus.br).
import csv
import io
import json
import statistics
import sys
import zipfile
from collections import Counter, defaultdict

DADOS, SAIDA = sys.argv[1], sys.argv[2]
CARGO = "6"  # deputado federal
ELEITO = {"ELEITO", "ELEITO POR QP", "ELEITO POR MÉDIA"}
UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split()

csv.field_size_limit(10_000_000)


def linhas(zip_path, membro):
    z = zipfile.ZipFile(zip_path)
    with z.open(membro) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";")


def valor(s):
    return float(s.replace(".", "").replace(",", ".")) if s not in ("", "#NULO", "#NULO#", "-1") else 0.0


# --- candidatos -------------------------------------------------------------------------------------
cand = {}
for r in linhas(f"{DADOS}/consulta_cand_2026.zip", "consulta_cand_2026_BRASIL.csv"):
    if r["CD_CARGO"] != CARGO:
        continue
    cand[r["SQ_CANDIDATO"]] = {
        "sq": r["SQ_CANDIDATO"], "nome": r["NM_URNA_CANDIDATO"], "nomeCompleto": r["NM_CANDIDATO"],
        "uf": r["SG_UF"], "partido": r["SG_PARTIDO"], "situacao": r["DS_SIT_TOT_TURNO"],
        "geracao": f'{r["DT_GERACAO"]} {r["HH_GERACAO"]}',
    }

# --- votos --------------------------------------------------------------------------------------------
votos = Counter()
sit_voto = {}
colunas_voto = None
geracao_voto = set()
linhas_uf = Counter()
zv = f"{DADOS}/votacao_candidato_munzona_2026.zip"
for uf in UFS:
    for r in linhas(zv, f"votacao_candidato_munzona_2026_{uf}.csv"):
        if colunas_voto is None:
            colunas_voto = list(r.keys())
        if r["CD_CARGO"] != CARGO:
            continue
        linhas_uf[uf] += 1
        geracao_voto.add(f'{r["DT_GERACAO"]} {r["HH_GERACAO"]}')
        col = "QT_VOTOS_NOMINAIS_VALIDOS" if "QT_VOTOS_NOMINAIS_VALIDOS" in r else "QT_VOTOS_NOMINAIS"
        votos[r["SQ_CANDIDATO"]] += int(r[col])
        sit_voto[r["SQ_CANDIDATO"]] = r["DS_SIT_TOT_TURNO"]

# --- receitas -------------------------------------------------------------------------------------------
zp = f"{DADOS}/prestacao_de_contas_eleitorais_candidatos_2026.zip"
rec = defaultdict(lambda: defaultdict(float))  # sq -> fonte -> valor
rec_nat = defaultdict(lambda: defaultdict(float))  # sq -> natureza -> valor
tipo_prest = defaultdict(set)
prestador = {}  # SQ_PRESTADOR_CONTAS -> SQ_CANDIDATO (só deputado federal)
fontes = Counter()
origens = Counter()
for r in linhas(zp, "receitas_candidatos_2026_BRASIL.csv"):
    if r["CD_CARGO"] != CARGO:
        continue
    v = valor(r["VR_RECEITA"])
    sq = r["SQ_CANDIDATO"]
    rec[sq][r["DS_FONTE_RECEITA"]] += v
    rec_nat[sq][r["DS_NATUREZA_RECEITA"]] += v
    tipo_prest[sq].add((r["TP_PRESTACAO_CONTAS"].upper(), r["SQ_PRESTADOR_CONTAS"]))
    prestador[r["SQ_PRESTADOR_CONTAS"]] = sq
    fontes[r["DS_FONTE_RECEITA"]] += v
    origens[r["DS_ORIGEM_RECEITA"]] += v

# --- despesas contratadas ----------------------------------------------------------------------------
desp = defaultdict(float)
desp_transf = defaultdict(float)  # doações a outros candidatos e partidos (não é gasto da própria campanha)
origem_desp = Counter()
for r in linhas(zp, "despesas_contratadas_candidatos_2026_BRASIL.csv"):
    if r["CD_CARGO"] != CARGO:
        continue
    v = valor(r["VR_DESPESA_CONTRATADA"])
    sq = r["SQ_CANDIDATO"]
    desp[sq] += v
    o = r["DS_ORIGEM_DESPESA"]
    origem_desp[o] += v
    if o.lower().startswith("doações") or o.lower().startswith("doacoes"):
        desp_transf[sq] += v
    tipo_prest[sq].add((r["TP_PRESTACAO_CONTAS"].upper(), r["SQ_PRESTADOR_CONTAS"]))
    prestador[r["SQ_PRESTADOR_CONTAS"]] = sq

# --- despesas pagas (por fonte) ------------------------------------------------------------------------
# O arquivo de pagamentos não traz cargo nem SQ_CANDIDATO: liga pelo SQ_PRESTADOR_CONTAS, que aparece nas
# receitas e nas despesas contratadas.
pago = defaultdict(lambda: defaultdict(float))
fontes_pagas = Counter()
colunas_pagas = None
for r in linhas(zp, "despesas_pagas_candidatos_2026_BRASIL.csv"):
    if colunas_pagas is None:
        colunas_pagas = list(r.keys())
    sq = prestador.get(r["SQ_PRESTADOR_CONTAS"])
    if sq is None:
        continue
    v = valor(r["VR_PAGTO_DESPESA"])
    pago[sq][r["DS_FONTE_DESPESA"]] += v
    fontes_pagas[r["DS_FONTE_DESPESA"]] += v

def eh_publico(fonte):
    f = fonte.upper().replace("Á", "A")
    return f in ("FUNDO ESPECIAL", "FUNDO PARTIDARIO") or f.startswith("FUNDO ESPECIAL DE FINANCIAMENTO") or f == "FUNDO PARTIDARIO"


def publico(fontes_sq):
    return sum(v for k, v in fontes_sq.items() if eh_publico(k))


# --- resultado oficial por UF (resultados.tse.jus.br, JSON da divulgação) ----------------------------------
# Serve pra conferir a votação por município e zona e pra cobrir UF que a carga de dados abertos não trouxe.
# Na carga de 12/11/2026, o CSV do Amapá veio sem nenhuma linha de deputado federal: os 8 eleitos do AP só
# existem no JSON. Do JSON só entra voto "Válido"; voto anulado (inclusive sub judice) vale zero, como em
# QT_VOTOS_NOMINAIS_VALIDOS.
import os
SIT_JSON = {"Eleito por QP": "ELEITO POR QP", "Eleito por média": "ELEITO POR MÉDIA", "Suplente": "SUPLENTE", "Não eleito": "NÃO ELEITO"}
json_votos, json_eleito, json_geracao, json_uf, json_sit = {}, set(), set(), {}, {}
pj = f"{DADOS}/resultados-json"
for uf in UFS:
    d = json.load(open(f"{pj}/{uf.lower()}-c0006-e006259-u.json", encoding="utf-8"))
    json_geracao.add(f'{uf} {d["dg"]} {d["hg"]}')
    for a in d["carg"][0]["agr"]:
        for pa in a["par"]:
            for c in pa["cand"]:
                json_votos[c["sqcand"]] = int(c["vap"] or 0) if c["dvt"] == "Válido" else 0
                json_uf[c["sqcand"]] = uf
                json_sit[c["sqcand"]] = SIT_JSON.get(c["st"], c["st"])
                if c["e"] == "s":
                    json_eleito.add(c["sqcand"])
ufs_do_json = [uf for uf in UFS if linhas_uf[uf] == 0]
for sq, uf in json_uf.items():
    if uf in ufs_do_json:
        votos[sq] = json_votos[sq]
        sit_voto[sq] = json_sit[sq]

# --- por candidato ---------------------------------------------------------------------------------------
# A situação vale a da votação (resultado da totalização). A consulta de candidatos de hoje traz 505 eleitos e
# a votação 513: a diferença fica registrada em "divergenciaSituacao".
lista = []
for sq, c in cand.items():
    c["sitCand"] = c["situacao"]
    if sit_voto.get(sq):
        c["situacao"] = sit_voto[sq]
    v = votos.get(sq, 0)
    g = desp.get(sq, 0.0)
    rt = sum(rec[sq].values()) if sq in rec else 0.0
    rp = publico(rec[sq]) if sq in rec else 0.0
    pt = sum(pago[sq].values()) if sq in pago else 0.0
    pp = publico(pago[sq]) if sq in pago else 0.0
    tipos = sorted({t for t, _ in tipo_prest.get(sq, set())})
    lista.append({**c, "votos": v, "gasto": round(g, 2), "transf": round(desp_transf.get(sq, 0.0), 2),
                  "receita": round(rt, 2), "receitaPublica": round(rp, 2),
                  "fefc": round(rec[sq].get("FUNDO ESPECIAL", 0.0), 2) if sq in rec else 0.0,
                  "fp": round(rec[sq].get("FUNDO PARTIDARIO", 0.0), 2) if sq in rec else 0.0,
                  "pago": round(pt, 2), "pagoPublico": round(pp, 2),
                  "estimavel": round(rec_nat[sq].get("ESTIMADO", 0.0) + rec_nat[sq].get("ESTIMAVEL", 0.0), 2) if sq in rec_nat else 0.0,
                  "prestacao": tipos, "sitVoto": sit_voto.get(sq)})


def q(xs, p):
    xs = sorted(xs)
    if not xs:
        return None
    k = (len(xs) - 1) * p
    i = int(k)
    return xs[i] + (xs[min(i + 1, len(xs) - 1)] - xs[i]) * (k - i)


def resumo(grupo):
    com = [c for c in grupo if c["votos"] > 0 and c["gasto"] > 0]
    cpv = [c["gasto"] / c["votos"] for c in com]
    G = sum(c["gasto"] for c in grupo)
    V = sum(c["votos"] for c in grupo)
    R = sum(c["receita"] for c in grupo)
    P = sum(c["receitaPublica"] for c in grupo)
    out = {
        "n": len(grupo), "nComGastoEVoto": len(com),
        "semGasto": sum(1 for c in grupo if c["gasto"] <= 0),
        "semVoto": sum(1 for c in grupo if c["votos"] <= 0),
        "semPrestacao": sum(1 for c in grupo if not c["prestacao"]),
        "gasto": round(G, 2), "votos": V, "receita": round(R, 2), "receitaPublica": round(P, 2),
        "fefc": round(sum(c["fefc"] for c in grupo), 2), "fp": round(sum(c["fp"] for c in grupo), 2),
        "custoAgregado": round(G / V, 4) if V else None,
        "pctPublicoReceita": round(100 * P / R, 3) if R else None,
        "mediana": round(statistics.median(cpv), 4) if cpv else None,
        "p10": q(cpv, 0.1), "p25": q(cpv, 0.25), "p75": q(cpv, 0.75), "p90": q(cpv, 0.9),
        "min": min(cpv) if cpv else None, "max": max(cpv) if cpv else None,
    }
    pagoT = sum(c["pago"] for c in grupo)
    if pagoT:
        out["pago"] = round(pagoT, 2)
        out["pagoPublico"] = round(sum(c["pagoPublico"] for c in grupo), 2)
        out["pctPublicoPago"] = round(100 * out["pagoPublico"] / pagoT, 3)
    gt = sum(c["gasto"] - c["transf"] for c in grupo)
    out["gastoSemTransf"] = round(gt, 2)
    out["custoAgregadoSemTransf"] = round(gt / V, 4) if V else None
    return out


eleitos = [c for c in lista if c["situacao"] in ELEITO]
nao = [c for c in lista if c["situacao"] not in ELEITO and c["situacao"] in ("SUPLENTE", "NÃO ELEITO")]
outros = Counter(c["situacao"] for c in lista if c["situacao"] not in ELEITO and c["situacao"] not in ("SUPLENTE", "NÃO ELEITO"))

partidos = {}
for p in sorted({c["partido"] for c in lista}):
    el = [c for c in eleitos if c["partido"] == p]
    nn = [c for c in nao if c["partido"] == p]
    partidos[p] = {"eleitos": resumo(el), "naoEleitos": resumo(nn), "todos": resumo(el + nn)}

ufs = {}
for uf in UFS:
    el = [c for c in eleitos if c["uf"] == uf]
    ufs[uf] = {"eleitos": resumo(el), "linhasVoto": linhas_uf[uf]}

com = sorted([c for c in eleitos if c["votos"] > 0 and c["gasto"] > 0], key=lambda c: c["gasto"] / c["votos"])
for c in com:
    c["cpv"] = round(c["gasto"] / c["votos"], 4)
    c["pctPublico"] = round(100 * c["receitaPublica"] / c["receita"], 2) if c["receita"] else None

out = {
    "geracao": {"candidatos": sorted({c["geracao"] for c in cand.values()}), "votacao": sorted(geracao_voto)},
    "colunasVotacao": colunas_voto, "colunasPagas": colunas_pagas,
    "nCandidatos": len(lista), "situacoes": Counter(c["situacao"] for c in lista),
    "situacoesNaVotacao": Counter(sit_voto.values()),
    "outrasSituacoes": outros,
    "eleitosSemVotoNaVotacao": [c["sq"] for c in eleitos if c["votos"] == 0],
    "divergenciaSituacao": [{k: c[k] for k in ("sq", "nome", "uf", "partido", "sitCand", "situacao", "votos")} for c in lista if c["sitCand"] != c["situacao"]],
    "conferenciaJson": {
        "geracao": sorted(json_geracao), "eleitosJson": len(json_eleito),
        "eleitosIguais": len(json_eleito & {c["sq"] for c in eleitos}),
        "ufsSoNoJson": ufs_do_json,
        "difVotos": [{"sq": c["sq"], "nome": c["nome"], "uf": c["uf"], "munzona": c["votos"], "json": json_votos.get(c["sq"])} for c in lista if json_votos.get(c["sq"], 0) != c["votos"]][:60],
        "nDifVotos": sum(1 for c in lista if json_votos.get(c["sq"], 0) != c["votos"]),
        "nDifSituacao": sum(1 for c in lista if c["sq"] in json_sit and json_sit[c["sq"]] != c["situacao"]),
    },
    "naVotacaoSemCandidato": [sq for sq in votos if sq not in cand],
    "tiposPrestacao": Counter(",".join(c["prestacao"]) or "nenhuma" for c in lista),
    "tiposPrestacaoEleitos": Counter(",".join(c["prestacao"]) or "nenhuma" for c in eleitos),
    "fontesReceita": fontes, "fontesPagas": fontes_pagas, "origensReceita": origens.most_common(), "origensDespesa": origem_desp.most_common(),
    "eleitos": resumo(eleitos), "naoEleitos": resumo(nao), "todos": resumo(eleitos + nao),
    "partidos": partidos, "ufs": ufs,
    "eleitosOrdenados": [{k: c[k] for k in ("sq", "nome", "nomeCompleto", "uf", "partido", "votos", "gasto", "transf", "receita", "receitaPublica", "fefc", "fp", "pago", "pagoPublico", "cpv", "pctPublico", "prestacao")} for c in com],
    "eleitosSemGasto": [{k: c[k] for k in ("sq", "nome", "uf", "partido", "votos", "gasto", "receita", "prestacao")} for c in eleitos if c["gasto"] <= 0],
    "naoEleitosCpv": sorted([round(c["gasto"] / c["votos"], 4) for c in nao if c["votos"] > 0 and c["gasto"] > 0]),
    "naoEleitosTop": sorted([{"sq": c["sq"], "nome": c["nome"], "uf": c["uf"], "partido": c["partido"], "votos": c["votos"], "gasto": c["gasto"]} for c in nao if c["votos"] > 0 and c["gasto"] > 0], key=lambda c: -c["gasto"] / c["votos"])[:15],
}
with open(SAIDA, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1, default=lambda o: dict(o) if isinstance(o, Counter) else str(o))
e = out["eleitos"]
print(f'eleitos {e["n"]} · com gasto e voto {e["nComGastoEVoto"]} · mediana R$ {e["mediana"]} · min {e["min"]} · max {e["max"]} · agregado {e["custoAgregado"]} · público {e["pctPublicoReceita"]}%')
n = out["naoEleitos"]
print(f'não eleitos {n["n"]} · agregado {n["custoAgregado"]} · mediana {n["mediana"]} · gasto {n["gasto"]}')
