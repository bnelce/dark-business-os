"""Conta focos de calor do BDQueimadas (INPE) para o reel fogo-cop (desmatamento × fogo, 09/11/2026).

Lê os arquivos que estão na pasta dados/ do reel (dados de fora: rodar com `python3 -I`, com este
script FORA da pasta de dados) e grava um resumo em JSON:

    python3 -I reels/scripts/fogo-cop-focos.py <pasta dados/ do reel> <saída contas.json>

Entradas esperadas em <dados>/:
    mensal/focos_mensal_br_2026MM.csv        todos os satélites, um arquivo por mês de 2026
    anual_todos/focos_br_todos-sats_AAAA.zip todos os satélites, 2019–2025
    anual_ref/focos_br_ref_AAAA.zip          satélite de referência, 2019–2025 (só para conferir)
    pa_ref/focos_br_pa_ref_AAAA.zip          Pará, satélite de referência, 2003–2018 (os outubros antigos)

Saída: contagens por ano, mês (1–12, pelo horário GMT do arquivo), satélite, bioma e estado, só
para os satélites de interesse (AQUA_M-T é o de referência; NOAA-20 serve de conferência), mais
a contagem do arquivo de referência para comparar com o AQUA_M-T filtrado do arquivo completo.
Focos marcados em área industrial (coluna id_area_industrial, só nos anuais de 2019–2022) ficam
fora, como no arquivo de referência. Nada é arredondado aqui: as médias e porcentagens saem do gerar-fogo-cop.mjs.
"""
import csv
import io
import json
import os
import sys
import zipfile
from collections import defaultdict

SATELITES = ("AQUA_M-T", "NOAA-20")
ESTADOS = ("PARÁ", "CEARÁ")


def nova():
    return defaultdict(int)


def conta_linhas(linhas, campos_data, campo_sat, por):
    """Soma as linhas em `por[(ano, mes, sat)]` → {'total', 'bioma:X', 'estado:Y'}."""
    leitor = csv.DictReader(linhas)
    cab = leitor.fieldnames or []
    campo_data = next((c for c in campos_data if c in cab), None)
    if campo_data is None:
        raise SystemExit(f"sem coluna de data em {cab}")
    sats_vistos = defaultdict(int)
    meses = defaultdict(int)
    for r in leitor:
        sat = r.get(campo_sat, "AQUA_M-T") if campo_sat else "AQUA_M-T"
        sats_vistos[sat] += 1
        if sat not in SATELITES:
            continue
        # Foco em área industrial (siderúrgica, tocha de refinaria): o arquivo de referência do INPE
        # não traz esses focos, e os anuais de 2019–2022 com todos os satélites ainda trazem, marcados
        # em id_area_industrial. Tirar aqui deixa o AQUA do arquivo completo igual ao de referência.
        ind = (r.get("id_area_industrial") or "").strip()
        if ind not in ("", "0"):
            sats_vistos["_industrial_" + sat] += 1
            continue
        d = r[campo_data].strip()
        ano, mes = int(d[0:4]), int(d[5:7])
        meses[f"{ano}-{mes:02d}"] += 1
        alvo = por[(ano, mes, sat)]
        alvo["total"] += 1
        alvo["bioma:" + (r.get("bioma") or "").strip()] += 1
        est = (r.get("estado") or "").strip().upper()
        if est in ESTADOS:
            alvo["estado:" + est] += 1
    return cab, {**dict(sats_vistos), "_meses_sat_interesse": dict(meses)}


def abre_zip(caminho):
    z = zipfile.ZipFile(caminho)
    nomes = [n for n in z.namelist() if n.lower().endswith(".csv")]
    if len(nomes) != 1:
        raise SystemExit(f"{caminho}: esperava 1 csv, achei {nomes}")
    return io.TextIOWrapper(z.open(nomes[0]), encoding="utf-8", errors="strict", newline="")


def main():
    dados, saida = sys.argv[1], sys.argv[2]
    todos = defaultdict(nova)
    ref = defaultdict(nova)
    log = {}

    for ano in range(2019, 2026):
        arq = os.path.join(dados, "anual_todos", f"focos_br_todos-sats_{ano}.zip")
        cab, sats = conta_linhas(abre_zip(arq), ("data_hora_gmt", "data_pas"), "satelite", todos)
        log[os.path.basename(arq)] = {"colunas": cab, "satelites": sats}
        arq = os.path.join(dados, "anual_ref", f"focos_br_ref_{ano}.zip")
        cab, sats = conta_linhas(abre_zip(arq), ("data_pas", "data_hora_gmt"), None, ref)
        log[os.path.basename(arq)] = {"colunas": cab, "linhas": sats.get("AQUA_M-T", 0), "meses": sats["_meses_sat_interesse"]}

    pa = defaultdict(nova)
    for ano in range(2003, 2019):
        arq = os.path.join(dados, "pa_ref", f"focos_br_pa_ref_{ano}.zip")
        cab, sats = conta_linhas(abre_zip(arq), ("data_pas", "data_hora_gmt"), None, pa)
        log[os.path.basename(arq)] = {"colunas": cab, "linhas": sats.get("AQUA_M-T", 0)}

    for mes in range(1, 11):
        arq = os.path.join(dados, "mensal", f"focos_mensal_br_2026{mes:02d}.csv")
        with open(arq, encoding="utf-8", errors="strict", newline="") as f:
            cab, sats = conta_linhas(f, ("data_hora_gmt", "data_pas"), "satelite", todos)
        log[os.path.basename(arq)] = {"colunas": cab, "satelites": sats}

    def serial(d):
        return [{"ano": a, "mes": m, "sat": s, **dict(sorted(v.items()))} for (a, m, s), v in sorted(d.items())]

    with open(saida, "w", encoding="utf-8") as f:
        json.dump({"todos": serial(todos), "ref": serial(ref), "paRef": serial(pa), "arquivos": log}, f, ensure_ascii=False, indent=1)
    print(f"ok: {len(todos)} grupos (todos), {len(ref)} (ref) → {saida}")


if __name__ == "__main__":
    main()
