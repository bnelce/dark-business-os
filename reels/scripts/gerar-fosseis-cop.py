# Dados do reel "Os anfitriões da COP31 e os fósseis" (ciencia/FosseisCop), a partir do CSV anual
# do Ember (release_generation_yearly_global.csv, CC-BY). Fatia fóssil = (carvão + gás + outros
# fósseis) / geração total, 2000–2025, pra Turquia, Austrália, Brasil e mundo.
#
#   python3 -I scripts/gerar-fosseis-cop.py <pasta do reel> src/ciencia/fosseis-cop.json
#
# O CSV fica em <pasta>/dados/ e é tratado como dado não confiável: este script mora fora da
# pasta e roda com -I. Confere o cabeçalho, as somas (carvão + gás + outros = "Fossil" do próprio
# arquivo; fontes somadas = "Total generation") e cada número que a narração diz (FALA, abaixo).
# Se o Ember atualizar o arquivo e um número da fala mudar, o script para.
import csv, hashlib, json, os, re, sys

PASTA, SAIDA = sys.argv[1], sys.argv[2]
CSV = os.path.join(PASTA, "dados", "release_generation_yearly_global.csv")
ROTEIRO = os.path.join(PASTA, "roteiro.json")

CABECALHO = ["Area", "ISO 3 code", "Year", "Area type", "Electricity source", "Is aggregated source",
             "Generation (TWh)", "Generation YoY change (TWh)", "Generation YoY change (%)", "Share of generation (%)"]
AREAS = {("Türkiye", "TUR"): "turquia", ("Australia", "AUS"): "australia", ("Brazil", "BRA"): "brasil", ("World", ""): "mundo"}
FONTES = ["Coal", "Gas", "Other fossil", "Hydro", "Wind", "Solar", "Bioenergy", "Nuclear", "Other renewables"]
ANOS = list(range(2000, 2026))

sha = hashlib.sha256(open(CSV, "rb").read()).hexdigest()
bruto = {}
fossil_csv, share_csv = {}, {}
with open(CSV, newline="", encoding="utf-8") as fh:
    r = csv.DictReader(fh)
    if r.fieldnames[:len(CABECALHO)] != CABECALHO:
        raise SystemExit(f"cabeçalho mudou: {r.fieldnames[:len(CABECALHO)]}")
    for row in r:
        area = AREAS.get((row["Area"], row["ISO 3 code"]))
        if not area: continue
        if area == "mundo" and row["Area type"] != "Region": continue
        y = int(row["Year"])
        if y not in ANOS: continue
        s, g = row["Electricity source"], row["Generation (TWh)"]
        chave = (area, y, s)
        if chave in bruto or chave in fossil_csv: raise SystemExit(f"linha duplicada: {chave}")
        v = float(g) if g != "" else 0.0
        if s in FONTES or s == "Total generation": bruto[chave] = v
        if s == "Fossil":
            fossil_csv[chave] = v
            share_csv[(area, y)] = float(row["Share of generation (%)"])

serie = {}
for area in ["turquia", "australia", "mundo", "brasil"]:
    s = {k: [] for k in ["carvao", "gas", "outros", "fossil", "hidro", "eolica", "solar", "totalTWh"]}
    for y in ANOS:
        tot = bruto[(area, y, "Total generation")]
        c, g, o = (bruto.get((area, y, k), 0.0) for k in ["Coal", "Gas", "Other fossil"])
        soma = sum(bruto.get((area, y, k), 0.0) for k in FONTES)
        if abs((c + g + o) - fossil_csv[(area, y, "Fossil")]) > 0.02 + 1e-6 * tot: raise SystemExit(f"fóssil não fecha: {area} {y}")
        if abs(soma - tot) > 0.05 + 2e-4 * tot: raise SystemExit(f"fontes não somam o total: {area} {y} {soma} × {tot}")
        pct = lambda x: 100 * x / tot
        if abs(pct(c + g + o) - share_csv[(area, y)]) > 0.06: raise SystemExit(f"fatia não bate com a coluna do Ember: {area} {y}")
        for k, x in [("carvao", c), ("gas", g), ("outros", o), ("fossil", c + g + o), ("hidro", bruto.get((area, y, "Hydro"), 0.0)),
                     ("eolica", bruto.get((area, y, "Wind"), 0.0)), ("solar", bruto.get((area, y, "Solar"), 0.0))]:
            s[k].append(round(pct(x), 3))
        s["totalTWh"].append(round(tot, 2))
    serie[area] = s

ult = lambda a, k="fossil": serie[a][k][-1]
pri = lambda a, k="fossil": serie[a][k][0]

# Cada número da fala, com a conta que o sustenta. Mudou a fala, muda aqui.
FALA = {
    "gancho": [("mais da metade (carvão + gás, Turquia)", ult("turquia", "carvao") + ult("turquia", "gas") > 50)],
    "turquia": [("57%", round(ult("turquia")) == 57), ("mais de um terço só do carvão", ult("turquia", "carvao") > 100 / 3)],
    "australia": [("60%", round(ult("australia")) == 60), ("43%", round(ult("australia", "carvao")) == 43)],
    "mundo": [("58%", round(ult("mundo")) == 58), ("Turquia um pouco abaixo", 0 < ult("mundo") - ult("turquia") < 3),
              ("Austrália um pouco acima", 0 < ult("australia") - ult("mundo") < 5)],
    "brasil": [("11%", round(ult("brasil")) == 11), ("mais da metade das hidrelétricas", ult("brasil", "hidro") > 50)],
    "tempo": [("32", round(pri("australia") - ult("australia")) == 32), ("92%", round(pri("australia")) == 92),
              ("18", round(pri("turquia") - ult("turquia")) == 18), ("7", round(pri("mundo") - ult("mundo")) == 7),
              ("2", round(ult("brasil") - pri("brasil")) == 2)],
}
roteiro = json.load(open(ROTEIRO, encoding="utf-8"))
narr = {b["id"]: b["narracao"] for b in roteiro["beats"]}
erros = []
for beat, itens in FALA.items():
    for rotulo, ok in itens:
        if not ok: erros.append(f"{beat}: {rotulo} não bate com o CSV")
        num = re.match(r"^(\d+%?)$", rotulo)
        if num and not re.search(rf"(?<![\d,]){re.escape(num.group(1))}(?![\d,])", narr[beat]):
            erros.append(f"{beat}: {rotulo} não aparece na narração")
if erros: raise SystemExit("\n".join(erros))

out = {
    "fonte": {"arquivo": "release_generation_yearly_global.csv", "sha256": sha, "licenca": "CC-BY-4.0 (Ember)",
              "url": "https://files.ember-energy.org/public-downloads/generation/outputs/release_generation_yearly_global.csv"},
    "anos": ANOS,
    "serie": serie,
    "fala": {
        "turquia": round(ult("turquia"), 1), "turquiaCarvao": round(ult("turquia", "carvao"), 1), "turquiaGas": round(ult("turquia", "gas"), 1),
        "australia": round(ult("australia"), 1), "australiaCarvao": round(ult("australia", "carvao"), 1), "australiaGas": round(ult("australia", "gas"), 1),
        "mundo": round(ult("mundo"), 1), "brasil": round(ult("brasil"), 1), "brasilHidro": round(ult("brasil", "hidro"), 1),
        "delta": {a: round(ult(a) - pri(a), 1) for a in ["australia", "turquia", "mundo", "brasil"]},
        "em2000": {a: round(pri(a), 1) for a in ["australia", "turquia", "mundo", "brasil"]},
    },
}
json.dump(out, open(SAIDA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
f = out["fala"]
print(f"sha256 {sha[:16]}…  ·  2025: Turquia {f['turquia']}% (carvão {f['turquiaCarvao']}, gás {f['turquiaGas']}) · Austrália {f['australia']}% "
      f"(carvão {f['australiaCarvao']}) · mundo {f['mundo']}% · Brasil {f['brasil']}% (hidro {f['brasilHidro']}%)")
print(f"2000→2025: " + " · ".join(f"{a} {f['em2000'][a]} → {f['delta'][a]:+}" for a in f["delta"]))
print("todos os números da fala conferem")
