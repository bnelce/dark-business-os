# Números do reel "Vai faltar luz em dezembro?" (ciencia/Apagao), tirados da base aberta do ONS
# (EAR diário por subsistema, um CSV por ano, 2021 a 2026). Os CSVs são dado baixado da internet:
# este script mora fora da pasta deles e roda com `python3 -I`.
#
#   cd reels && python3 -I scripts/gerar-apagao.py ../<pasta do reel> src/ciencia/apagao.json
#
# Confere o cabeçalho, que cada ano tem os 4 subsistemas no dia 10/11, e cada número que a fala
# diz (lista FALA). Se o ONS revisar um valor e a fala deixar de bater, o script para.
import csv, json, sys
from pathlib import Path

PASTA, SAIDA = Path(sys.argv[1]), Path(sys.argv[2])
DADOS = PASTA / "dados"
ANOS = range(2021, 2027)
DIA = "11-10"
CAB = ["id_subsistema", "nom_subsistema", "ear_data", "ear_max_subsistema", "ear_verif_subsistema_mwmes", "ear_verif_subsistema_percentual"]

linhas = {}
for ano in ANOS:
    with open(DADOS / f"EAR_DIARIO_SUBSISTEMA_{ano}.csv", encoding="utf-8-sig", newline="") as fh:
        r = csv.reader(fh, delimiter=";")
        cab = next(r)
        assert cab == CAB, f"cabeçalho mudou em {ano}: {cab}"
        for l in r:
            sub, data = l[0].strip(), l[2]
            assert data.startswith(str(ano)), f"data fora do ano em {ano}: {data}"
            linhas[(sub, data)] = {"max": float(l[3]), "mwmes": float(l[4]), "pct": float(l[5])}

def dia(sub, ano, md=DIA):
    v = linhas.get((sub, f"{ano}-{md}"))
    assert v, f"falta {sub} em {ano}-{md}"
    # o percentual do ONS tem que bater com mwmes / max
    assert abs(v["mwmes"] / v["max"] * 100 - v["pct"]) < 0.01, f"percentual não bate: {sub} {ano}"
    return v

SUBS = ["SE", "S", "NE", "N"]
hoje = {s: dia(s, 2026) for s in SUBS}
cap_total = sum(hoje[s]["max"] for s in SUBS)
fatia = {s: hoje[s]["max"] / cap_total * 100 for s in SUBS}
sin = {ano: sum(dia(s, ano)["mwmes"] for s in SUBS) / sum(dia(s, ano)["max"] for s in SUBS) * 100 for ano in ANOS}

por_ano = {s: {ano: round(dia(s, ano)["pct"], 1) for ano in ANOS} for s in ["SE", "N"]}
se, n = por_ano["SE"], por_ano["N"]

# Última data da base de 2026: o 10/11 tem que ser a mais recente, senão o "estão em" envelheceu.
ultima = max(d for (s, d) in linhas if d.startswith("2026"))

# --- conferência da fala -----------------------------------------------------------------
roteiro = json.loads((PASTA / "roteiro.json").read_text(encoding="utf-8"))
fala = {b["id"]: b["narracao"] for b in roteiro["beats"]}
def exige(id_, trecho):
    assert trecho in fala[id_], f'fala {id_} não diz "{trecho}"'

exige("sudeste", f"{round(fatia['SE'])}% dela")
exige("sudeste", f"em {round(se[2026])}%")
exige("compara", f"{round(se[2025])}%")
assert se[2021] < 19, "2021 não ficou abaixo de 19%"
exige("compara", "menos de 19%")
exige("norte", f"{round(n[2026])}%, contra {round(n[2025])}% em 2025")
assert n[2025] == max(n.values()), "2025 não é o Norte mais cheio da série"
exige("norte", "mais cheio em seis")
exige("norte", f"só {round(fatia['N'])}% da água")
assert n[2026] < n[2025] and se[2026] > se[2025], "a direção das comparações mudou"
assert all(dia(s, 2026)["pct"] >= dia(s, 2025)["pct"] for s in ["SE", "NE"]), "NE/SE abaixo de 2025"

saida = {
    "data": "2026-11-10",
    "ultimaData": ultima,
    "se": se, "n": n,
    "sul": {ano: round(dia("S", ano)["pct"], 1) for ano in ANOS},
    "ne": {ano: round(dia("NE", ano)["pct"], 1) for ano in ANOS},
    "sin": {ano: round(v, 1) for ano, v in sin.items()},
    "fatia": {s: round(v, 1) for s, v in fatia.items()},
}
SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"última data na base 2026: {ultima}")
print("SE", se); print("N ", n)
print("fatia da capacidade", saida["fatia"]); print("SIN", saida["sin"])
print("sul", saida["sul"]); print("ne", saida["ne"])
