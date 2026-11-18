import { Composition } from "remotion";
import { QuizRelampago, type QuizProps } from "./formatos/QuizRelampago";
import { EstudoPapel, type EstudoPapelProps } from "./formatos/EstudoPapel";
import { MapaMental, type MapaMentalProps } from "./formatos/MapaMental";
import { MapaComparativo, type MapaComparativoProps } from "./formatos/MapaComparativo";
import { MarxAula, MARX_TOTAL } from "./aula/MarxAula";
import { PilaresAula, PILARES_TOTAL } from "./aula/PilaresAula";
import { L01CircTrig, L01_TOTAL } from "./lab/L01CircTrig";
import { L02Pitagoras, L02_TOTAL } from "./lab/L02Pitagoras";
import { L03Sohcahtoa, L03_TOTAL } from "./lab/L03Sohcahtoa";
import { L04Vetores, L04_TOTAL } from "./lab/L04Vetores";
import { L05Lancamento, L05_TOTAL } from "./lab/L05Lancamento";
import { L06ErroAlgebra, L06_TOTAL } from "./lab/L06ErroAlgebra";
import { L07Cinetica, L07_TOTAL } from "./lab/L07Cinetica";
import { L08Grafico, L08_TOTAL } from "./lab/L08Grafico";
import { L09LinhaTempo, L09_TOTAL } from "./lab/L09LinhaTempo";
import { L10Diagrama, L10_TOTAL } from "./lab/L10Diagrama";
import { L11ProdutosNotaveis, L11_TOTAL } from "./lab/L11ProdutosNotaveis";
import { L12QuadradoDiferenca, L12_TOTAL } from "./lab/L12QuadradoDiferenca";
import { L13DiferencaQuadrados, L13_TOTAL } from "./lab/L13DiferencaQuadrados";
import { L14Porcentagem, L14_TOTAL } from "./lab/L14Porcentagem";
import { L15Groenlandia, L15_TOTAL } from "./lab/L15Groenlandia";
import { L16VelocidadeMedia, L16_TOTAL } from "./lab/L16VelocidadeMedia";
import { L17GraficosFuncoes, L17_TOTAL } from "./lab/L17GraficosFuncoes";
import { L18EspcexVertices, L18_TOTAL } from "./lab/L18EspcexVertices";
import { L19EspcexCubos, L19_TOTAL } from "./lab/L19EspcexCubos";
import { L20TeoremaResto, L20_TOTAL } from "./lab/L20TeoremaResto";
import { L21PenduloEnergia, L21_TOTAL, L21_FPS } from "./lab/L21PenduloEnergia";
import { L22PenduloEnergiaPT, L22_TOTAL, L22_FPS } from "./lab/L22PenduloEnergiaPT";
import { L23PitagorasProva, L23_TOTAL } from "./lab/L23PitagorasProva";
import { Showreel, SHOWREEL_TOTAL } from "./flor/Showreel";
import { Apuracao, APURACAO_TOTAL } from "./ciencia/Apuracao";
import { Fogo, FOGO_TOTAL } from "./ciencia/Fogo";
import { Apuracao2Turno, APURACAO_2T_TOTAL } from "./ciencia/Apuracao2Turno";
import { Benford, BENFORD_TOTAL } from "./ciencia/Benford";
import { VotoNulo, VOTO_NULO_TOTAL } from "./ciencia/VotoNulo";
import { Pesquisas, PESQUISAS_TOTAL } from "./ciencia/Pesquisas";
import { Quociente, QUOCIENTE_TOTAL } from "./ciencia/Quociente";
import { Emissoes, EMISSOES_TOTAL } from "./ciencia/Emissoes";
import { Potencia, POTENCIA_TOTAL } from "./ciencia/Potencia";
import { FogoCeara, FOGO_CEARA_TOTAL } from "./ciencia/FogoCeara";
import { DRex, DREX_TOTAL } from "./ciencia/DRex";
import { Dolar, DOLAR_TOTAL } from "./ciencia/Dolar";
import { Roadster, ROADSTER_TOTAL } from "./ciencia/Roadster";
import { BrasilMiniatura, BrasilMiniaturaCapa, MINIATURA_TOTAL } from "./ciencia/BrasilMiniatura";
import { SalarioCesta, SalarioCestaCapa, SALARIO_TOTAL } from "./ciencia/SalarioCesta";
import { OrigemVotos, OrigemVotosCapa, ORIGEM_VOTOS_TOTAL } from "./ciencia/OrigemVotos";
import { SiteEleicoes, SiteEleicoesCapa, SITE_ELEICOES_TOTAL } from "./ciencia/SiteEleicoes";
import { Binance, BinanceCapa, BINANCE_TOTAL } from "./ciencia/Binance";
import { FogoCop, FogoCopCapa, FOGO_COP_TOTAL } from "./ciencia/FogoCop";
import { FosseisCop, FosseisCopCapa, FOSSEIS_COP_TOTAL } from "./ciencia/FosseisCop";
import { ElNino, ElNinoCapa, ELNINO_TOTAL } from "./ciencia/ElNino";
import { Promessas, PromessasCapa, PROMESSAS_TOTAL } from "./ciencia/Promessas";
import { Paraguai, ParaguaiCapa, PARAGUAI_TOTAL } from "./ciencia/Paraguai";
import { Voyager, VoyagerCapa, VOYAGER_TOTAL } from "./ciencia/Voyager";
import { AulaOndas, AULA_ONDAS_TOTAL } from "./ciencia/AulaOndas";
import { AulaDecibeis, AULA_DECIBEIS_TOTAL } from "./ciencia/AulaDecibeis";
import { EnemTri, EnemTriCapa, ENEM_TRI_TOTAL } from "./ciencia/EnemTri";
import { Geladeiras, GeladeirasCapa, GELADEIRAS_TOTAL } from "./ciencia/Geladeiras";
import { ComMarca } from "./ciencia/marca";

// Shorts da A2LO: os mesmos reels com a marca da A2LO (selo no canto e assinatura do fim).
const A2LOGeladeiras = () => <ComMarca marca="a2lo"><Geladeiras /></ComMarca>;
const A2LOParaguai = () => <ComMarca marca="a2lo"><Paraguai /></ComMarca>;
const A2LOBinance = () => <ComMarca marca="a2lo"><Binance /></ComMarca>;
const A2LOSalarioCesta = () => <ComMarca marca="a2lo"><SalarioCesta /></ComMarca>;
import { Apagao, ApagaoCapa, APAGAO_TOTAL } from "./ciencia/Apagao";
import { Gta6, Gta6Capa, GTA6_TOTAL } from "./ciencia/Gta6";
import { Gta6Nz, Gta6NzCapa, Gta6NzCapaB, Gta6CapaB, GTA6NZ_TOTAL } from "./ciencia/Gta6Nz";
import { ChecagemFala, ChecagemFalaCapa, CHECAGEM_FALA_TOTAL } from "./ciencia/ChecagemFala";
import { Patrimonio, PatrimonioCapa, PATRIMONIO_TOTAL } from "./ciencia/Patrimonio";
import { CotaResultado, CotaResultadoCapa, COTA_RESULTADO_TOTAL } from "./ciencia/CotaResultado";
import { CustoVoto, CustoVotoCapa, CUSTO_VOTO_TOTAL } from "./ciencia/CustoVoto";

const propsDeExemplo: QuizProps = {
  roteiro: {
    disciplina: "fisica",
    beats: [
      { id: "gancho", textoTela: "Você sabe\nresponder isso?", narracao: "Teste seus conhecimentos!" },
      { id: "pergunta", textoTela: "60 km/h por 2h\n= quantos km?", narracao: "..." },
      { id: "resposta", textoTela: "120 km", narracao: "...", enfase: "120" },
      { id: "cta", textoTela: "Salva pra revisar", narracao: "..." },
    ],
  },
  timeline: {
    totalFrames: 540,
    beats: [
      { id: "gancho", arquivo: "beat-01.mp3", deFrame: 0, frames: 90 },
      { id: "pergunta", arquivo: "beat-02.mp3", deFrame: 90, frames: 180 },
      { id: "resposta", arquivo: "beat-03.mp3", deFrame: 270, frames: 150 },
      { id: "cta", arquivo: "beat-04.mp3", deFrame: 420, frames: 120 },
    ],
  },
};

// fps/width/height duplicam FPS/LARGURA/ALTURA de scripts/reels/timeline.js.
// Duplicação deliberada: este é um pacote npm separado e não importa do repo pai.
// Mudou aqui, mude lá — o teste em scripts/reels/timeline.test.js lê este
// arquivo como texto e falha se os dois lados divergirem.

const propsPapel: EstudoPapelProps = {
  foto: "fotos/mao-checklist-caderno.jpg",
  beats: [
    { tipo: "escrito", texto: "de onde vem\no oxigênio que\nvocê respira?", frames: 75, tamanho: 108 },
    { tipo: "marcado", antes: "da ", destaque: "fotossíntese", depois: "", frames: 60 },
    { tipo: "escrito", texto: "CO₂ + água + luz\n\nvira\n\nglicose + O₂", frames: 120, tamanho: 92 },
    { tipo: "escrito", texto: "cai em prova:\nsó acontece\nCOM luz", frames: 105, tamanho: 104 },
    { tipo: "escrito", texto: "revisão nova\ntodo dia", frames: 75, tamanho: 106 },
  ],
  totalFrames: 435,
};


// Sociologia — fundamentos de Karl Marx. Conteúdo padrão de vestibular/ENEM.
const propsMapa: MapaMentalProps = {
  foto: "fotos/karl-marx.jpg",
  materia: "Sociologia",
  tema: "KARL MARX",
  ramos: [
    { titulo: "Materialismo histórico", legenda: "quem produz e como\ndefine a sociedade", x: 300, y: 880, cor: "#4facfe", at: 40 },
    { titulo: "Luta de classes", legenda: "motor da história:\nburguesia x proletariado", x: 780, y: 880, cor: "#fa709a", at: 118 },
    { titulo: "Mais-valia", legenda: "o lucro vem do\ntrabalho não pago", x: 300, y: 1330, cor: "#43e97b", at: 196 },
    { titulo: "Alienação", legenda: "o trabalhador não se\nreconhece no que produz", x: 780, y: 1330, cor: "#f093fb", at: 274 },
  ],
  totalFrames: 480,
};


// Sociologia — os 3 clássicos respondendo à MESMA pergunta. É o recorte que cai
// em prova: não o que cada um disse, mas de onde cada um parte.
const propsComparativo: MapaComparativoProps = {
  materia: "Sociologia",
  pergunta: "o que move a sociedade?",
  figuras: [
    {
      nome: "Durkheim", datas: "1858 — 1917", foto: "fotos/emile-durkheim.jpg",
      conceito: "FATO SOCIAL", eixo: "o todo", cor: "#4facfe", y: 560, at: 46,
      frase: "a sociedade existe antes de você\ne te molda por coerção",
    },
    {
      nome: "Weber", datas: "1864 — 1920", foto: "fotos/max-weber.jpg",
      conceito: "AÇÃO SOCIAL", eixo: "o indivíduo", cor: "#f093fb", y: 890, at: 166,
      frase: "importa o sentido que o\nindivíduo dá ao que faz",
    },
    {
      nome: "Marx", datas: "1818 — 1883", foto: "fotos/karl-marx.jpg",
      conceito: "LUTA DE CLASSES", eixo: "o conflito", cor: "#fa709a", y: 1220, at: 286,
      frase: "as condições materiais\nmovem a história",
    },
  ],
  totalFrames: 570,
};

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="QuizRelampago"
    component={QuizRelampago}
    durationInFrames={propsDeExemplo.timeline.totalFrames}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={propsDeExemplo}
    calculateMetadata={({ props }) => ({ durationInFrames: props.timeline.totalFrames })}
  />
  <Composition id="PilaresAula" component={PilaresAula} durationInFrames={PILARES_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="MarxAula" component={MarxAula} durationInFrames={MARX_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L01CircTrig" component={L01CircTrig} durationInFrames={L01_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L02Pitagoras" component={L02Pitagoras} durationInFrames={L02_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L03Sohcahtoa" component={L03Sohcahtoa} durationInFrames={L03_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L04Vetores" component={L04Vetores} durationInFrames={L04_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L05Lancamento" component={L05Lancamento} durationInFrames={L05_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L06ErroAlgebra" component={L06ErroAlgebra} durationInFrames={L06_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L07Cinetica" component={L07Cinetica} durationInFrames={L07_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L08Grafico" component={L08Grafico} durationInFrames={L08_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L09LinhaTempo" component={L09LinhaTempo} durationInFrames={L09_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L10Diagrama" component={L10Diagrama} durationInFrames={L10_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L11ProdutosNotaveis" component={L11ProdutosNotaveis} durationInFrames={L11_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L12QuadradoDiferenca" component={L12QuadradoDiferenca} durationInFrames={L12_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L13DiferencaQuadrados" component={L13DiferencaQuadrados} durationInFrames={L13_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L14Porcentagem" component={L14Porcentagem} durationInFrames={L14_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L15Groenlandia" component={L15Groenlandia} durationInFrames={L15_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L16VelocidadeMedia" component={L16VelocidadeMedia} durationInFrames={L16_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L17GraficosFuncoes" component={L17GraficosFuncoes} durationInFrames={L17_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L18EspcexVertices" component={L18EspcexVertices} durationInFrames={L18_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L19EspcexCubos" component={L19EspcexCubos} durationInFrames={L19_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="FlorShowreel" component={Showreel} durationInFrames={SHOWREEL_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L20TeoremaResto" component={L20TeoremaResto} durationInFrames={L20_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="L21PenduloEnergia" component={L21PenduloEnergia} durationInFrames={L21_TOTAL} fps={L21_FPS} width={1080} height={1920} />
  <Composition id="L22PenduloEnergiaPT" component={L22PenduloEnergiaPT} durationInFrames={L22_TOTAL} fps={L22_FPS} width={1080} height={1920} />
  <Composition id="L23PitagorasProva" component={L23PitagorasProva} durationInFrames={L23_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVApuracao1Turno" component={Apuracao} durationInFrames={APURACAO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVApuracao2Turno" component={Apuracao2Turno} durationInFrames={APURACAO_2T_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVBenford" component={Benford} durationInFrames={BENFORD_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVVotoNulo" component={VotoNulo} durationInFrames={VOTO_NULO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVPesquisas" component={Pesquisas} durationInFrames={PESQUISAS_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVQuociente" component={Quociente} durationInFrames={QUOCIENTE_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVEmissoes" component={Emissoes} durationInFrames={EMISSOES_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVPotencia" component={Potencia} durationInFrames={POTENCIA_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVFogoPara" component={Fogo} durationInFrames={FOGO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVFogoCeara" component={FogoCeara} durationInFrames={FOGO_CEARA_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVDRex" component={DRex} durationInFrames={DREX_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVDolar" component={Dolar} durationInFrames={DOLAR_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVRoadster" component={Roadster} durationInFrames={ROADSTER_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVBrasilMiniatura" component={BrasilMiniatura} durationInFrames={MINIATURA_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVBrasilMiniaturaCapa" component={BrasilMiniaturaCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVSalarioCesta" component={SalarioCesta} durationInFrames={SALARIO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVSalarioCestaCapa" component={SalarioCestaCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVOrigemVotos" component={OrigemVotos} durationInFrames={ORIGEM_VOTOS_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVOrigemVotosCapa" component={OrigemVotosCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVSiteEleicoes" component={SiteEleicoes} durationInFrames={SITE_ELEICOES_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVSiteEleicoesCapa" component={SiteEleicoesCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVBinance" component={Binance} durationInFrames={BINANCE_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVBinanceCapa" component={BinanceCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVFogoCop" component={FogoCop} durationInFrames={FOGO_COP_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVFogoCopCapa" component={FogoCopCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVFosseisCop" component={FosseisCop} durationInFrames={FOSSEIS_COP_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVFosseisCopCapa" component={FosseisCopCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVElNino" component={ElNino} durationInFrames={ELNINO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVElNinoCapa" component={ElNinoCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVPromessas" component={Promessas} durationInFrames={PROMESSAS_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVPromessasCapa" component={PromessasCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVParaguai" component={Paraguai} durationInFrames={PARAGUAI_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVParaguaiCapa" component={ParaguaiCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVVoyager" component={Voyager} durationInFrames={VOYAGER_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVVoyagerCapa" component={VoyagerCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVAulaOndas" component={AulaOndas} durationInFrames={AULA_ONDAS_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVAulaDecibeis" component={AulaDecibeis} durationInFrames={AULA_DECIBEIS_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVEnemTri" component={EnemTri} durationInFrames={ENEM_TRI_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVEnemTriCapa" component={EnemTriCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVGeladeiras" component={Geladeiras} durationInFrames={GELADEIRAS_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVGeladeirasCapa" component={GeladeirasCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="A2LOGeladeiras" component={A2LOGeladeiras} durationInFrames={GELADEIRAS_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="A2LOParaguai" component={A2LOParaguai} durationInFrames={PARAGUAI_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="A2LOBinance" component={A2LOBinance} durationInFrames={BINANCE_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="A2LOSalarioCesta" component={A2LOSalarioCesta} durationInFrames={SALARIO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVApagao" component={Apagao} durationInFrames={APAGAO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVApagaoCapa" component={ApagaoCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVGta6" component={Gta6} durationInFrames={GTA6_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVGta6Capa" component={Gta6Capa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVGta6CapaB" component={Gta6CapaB} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVGta6Nz" component={Gta6Nz} durationInFrames={GTA6NZ_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVGta6NzCapa" component={Gta6NzCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVGta6NzCapaB" component={Gta6NzCapaB} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVChecagemFala" component={ChecagemFala} durationInFrames={CHECAGEM_FALA_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVChecagemFalaCapa" component={ChecagemFalaCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVPatrimonio" component={Patrimonio} durationInFrames={PATRIMONIO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVPatrimonioCapa" component={PatrimonioCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVCotaResultado" component={CotaResultado} durationInFrames={COTA_RESULTADO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVCotaResultadoCapa" component={CotaResultadoCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="CVCustoVoto" component={CustoVoto} durationInFrames={CUSTO_VOTO_TOTAL} fps={30} width={1080} height={1920} />
  <Composition id="CVCustoVotoCapa" component={CustoVotoCapa} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition
    id="MapaComparativo"
    component={MapaComparativo}
    durationInFrames={propsComparativo.totalFrames}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={propsComparativo}
    calculateMetadata={({ props }) => ({ durationInFrames: props.totalFrames })}
  />
  <Composition
    id="MapaMental"
    component={MapaMental}
    durationInFrames={propsMapa.totalFrames}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={propsMapa}
    calculateMetadata={({ props }) => ({ durationInFrames: props.totalFrames })}
  />
  <Composition
    id="EstudoPapel"
    component={EstudoPapel}
    durationInFrames={propsPapel.totalFrames}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={propsPapel}
    calculateMetadata={({ props }) => ({ durationInFrames: props.totalFrames })}
  />
  </>
);
