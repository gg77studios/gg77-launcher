import type { AchievementDef, AvatarDef, BannerDef, Game, Persisted, Tier } from "./types";

/** Põe o ícone de cada conquista a partir do id (arquivo com o mesmo nome na pasta). */
const withIcons = (dir: string, ext: string, list: AchievementDef[]): AchievementDef[] =>
  list.map((a) => ({ ...a, icon: `${dir}${a.id}${ext}` }));

const IDLE_ICONS = "/games/idle-legends/achievements/";
const TRIBOS_ICONS = "/games/tribos/achievements/";
const TRIBOS_BANNERS = "/games/tribos/banners/";
const CORRE_ICONS = "/games/corre/achievements/";
const CORRE_BANNERS = "/games/corre/banners/";
const IDLE_AVATARS = "/games/idle-legends/avatars/";
const TRIBOS_AVATARS = "/games/tribos/avatars/";
const CORRE_AVATARS = "/games/corre/avatars/";

/** Jogos que já vêm no launcher. Para adicionar um novo jogo do grupo, inclua aqui. */
export const CATALOG: Game[] = [
  {
    id: "idle-legends",
    title: "Legendforge",
    // só roda instalado pelo launcher (desde a virada de 2026-11-21 não existe mais versão web)
    url: "",
    package: { manifest: "https://github.com/gg77studios/gg77-builds/releases/download/catalog/idle-legends.json" },
    cover: "/games/idle-legends/cover.jpg",
    banner: "/games/idle-legends/banner.jpg",
    icon: "/games/idle-legends/icon.png",
    tint: "#1f2329",
    tagline: "RPG idle com arena, prestígio e hall da fama.",
    // O jogo envia estas conquistas pelo SDK (client/src/lib/launcher.js no repositório do jogo).
    // Os ids feat_* são os feitos do próprio jogo; os outros são momentos que só o launcher premia.
    // Outras conquistas do jogo (bestiário, chefes, pódio de evento, medalhas de ouro) chegam com
    // título próprio e aparecem como extras quando liberadas.
    // ícones: a arte de interface do próprio jogo (pixel art)
    pixelArt: true,
    achievements: withIcons(IDLE_ICONS, ".png", [
      { id: "primeira-vitoria", title: "Primeiro sangue", description: "Vença a primeira luta.", tier: "comum" },
      { id: "nivel-10", title: "Aventureiro", description: "Chegue ao nível 10.", tier: "comum" },
      { id: "lendario", title: "Brilho lendário", description: "Tenha um item lendário.", tier: "rara" },
      { id: "evento", title: "Presente no evento", description: "Participe de um evento.", tier: "comum" },
      { id: "feat_level_30", title: "No Auge", description: "Chegue ao nível 30.", tier: "rara" },
      { id: "feat_prestige_1", title: "Renascido", description: "Faça o primeiro prestígio.", tier: "rara" },
      { id: "feat_prestige_3", title: "Imortal", description: "Faça 3 prestígios.", tier: "épica" },
      { id: "feat_ruin_1", title: "Terra Arrasada", description: "300 abates numa única exploração de uma área.", tier: "comum" },
      { id: "feat_ruin_3", title: "Incendiário", description: "Terra Arrasada em 3 áreas.", tier: "rara" },
      { id: "feat_ruin_all", title: "Fim do Mundo", description: "Terra Arrasada em todas as áreas.", tier: "épica" },
      { id: "feat_farm_10", title: "Vigia", description: "10 horas de patrulha.", tier: "comum" },
      { id: "feat_farm_50", title: "Batedor", description: "50 horas de patrulha.", tier: "rara" },
      { id: "feat_farm_200", title: "Sentinela", description: "200 horas de patrulha.", tier: "épica" },
      { id: "feat_medals_all", title: "Colecionador", description: "Medalha de ouro em todos os inimigos comuns.", tier: "épica" },
      { id: "arena-top3", title: "Pódio da Arena", description: "Termine a temporada entre os 3 primeiros da Arena.", tier: "épica" },
      { id: "hall-da-fama", title: "Lenda da sala", description: "Entre para o hall da fama de uma sala.", tier: "épica", hidden: true },
    ]),
    // ícone das conquistas extras que o jogo manda (pelo prefixo do id)
    iconRules: [
      { match: "^bestiary_", icon: `${IDLE_ICONS}extra-bestiary.png` },
      { match: "^boss_slain_", icon: `${IDLE_ICONS}extra-boss.png` },
      { match: "^event_", icon: `${IDLE_ICONS}extra-event.png` },
      { match: "^rarity_", icon: `${IDLE_ICONS}extra-rarity.png` },
      { match: "^run_noheal", icon: `${IDLE_ICONS}extra-noheal.png` },
      { match: "^run_kills_", icon: `${IDLE_ICONS}extra-ruin.png` },
      { match: "^enemy_kills_", icon: `${IDLE_ICONS}extra-medal.png` },
      { match: ".", icon: `${IDLE_ICONS}extra-default.png` },
    ],
    // banners de perfil com a arte do próprio jogo, vendidos na loja (`unlock` é legado: migração e raridade)
    // avatares da loja: heróis e inimigos do próprio jogo (pixel art); recortes de scripts/make-avatars.py
    avatars: [
      { id: "guerreiro", name: "Guerreiro", image: `${IDLE_AVATARS}guerreiro.png`, rarity: "comum" },
      { id: "ladina", name: "Ladina", image: `${IDLE_AVATARS}ladina.png`, rarity: "comum" },
      { id: "goblin", name: "Goblin", image: `${IDLE_AVATARS}goblin.png`, rarity: "comum" },
      { id: "lobo-das-neves", name: "Lobo das neves", image: `${IDLE_AVATARS}lobo-das-neves.png`, rarity: "comum" },
      { id: "kitsune", name: "Kitsune", image: `${IDLE_AVATARS}kitsune.png`, rarity: "rara" },
      { id: "yurei", name: "Yurei", image: `${IDLE_AVATARS}yurei.png`, rarity: "rara" },
      { id: "apparition", name: "Aparição", image: `${IDLE_AVATARS}apparition.png`, rarity: "rara" },
      { id: "jarl-de-gelo", name: "Jarl de gelo", image: `${IDLE_AVATARS}jarl-de-gelo.png`, rarity: "rara" },
      { id: "valquiria-caida", name: "Valquíria caída", image: `${IDLE_AVATARS}valquiria-caida.png`, rarity: "épica" },
      { id: "oni-shogun", name: "Oni shogun", image: `${IDLE_AVATARS}oni-shogun.png`, rarity: "épica" },
      { id: "lich-lord", name: "Lorde lich", image: `${IDLE_AVATARS}lich-lord.png`, rarity: "épica" },
      { id: "ember-dragon", name: "Dragão de brasa", image: `${IDLE_AVATARS}ember-dragon.png`, rarity: "lendária" },
    ],
    banners: [
      { id: "floresta", title: "Floresta Sombria", image: "/games/idle-legends/banners/floresta.jpg", unlock: "primeira-vitoria" },
      { id: "minas", title: "Minas", image: "/games/idle-legends/banners/minas.jpg", unlock: "nivel-10" },
      { id: "mercado", title: "Mercado", image: "/games/idle-legends/banners/mercado.jpg", unlock: "lendario" },
      { id: "cerejeiras", title: "Bosque das Cerejeiras", image: "/games/idle-legends/banners/cerejeiras.jpg", unlock: "evento" },
      { id: "cripta", title: "Cripta", image: "/games/idle-legends/banners/cripta.jpg", unlock: "feat_level_30" },
      { id: "pantano", title: "Pântano", image: "/games/idle-legends/banners/pantano.jpg", unlock: "feat_prestige_1" },
      { id: "floresta-chamas", title: "Floresta em chamas", image: "/games/idle-legends/banners/floresta-chamas.jpg", unlock: "feat_ruin_1" },
      { id: "bestiario", title: "Bestiário", image: "/games/idle-legends/banners/bestiario.jpg", unlock: "feat_farm_50" },
      { id: "caldeira", title: "Caldeira", image: "/games/idle-legends/banners/caldeira.jpg", unlock: "feat_prestige_3" },
      { id: "caldeira-arrasada", title: "Caldeira arrasada", image: "/games/idle-legends/banners/caldeira-arrasada.jpg", unlock: "feat_ruin_all" },
      { id: "arena", title: "Arena", image: "/games/idle-legends/banners/arena.jpg", unlock: "arena-top3" },
      { id: "salao", title: "Salão da fama", image: "/games/idle-legends/banners/salao.jpg", unlock: "hall-da-fama" },
    ],
  },
  {
    id: "tribos",
    title: "Clanfall",
    // só roda instalado pelo launcher; o servidor exige a conta GG77 (token do hub)
    url: "",
    package: { manifest: "https://github.com/gg77studios/gg77-builds/releases/download/catalog/tribos.json" },
    cover: "/games/tribos/cover.jpg",
    banner: "/games/tribos/banner.jpg",
    icon: "/games/tribos/icon.png",
    tint: "#2d2721",
    tagline: "RTS em hexágonos para até 5 clãs: junte comida, madeira e pedra, erga muros e torres.",
    // ícones: a arte pintada do próprio jogo (Gemini)
    pixelArt: false,
    // O jogo manda estas conquistas pelo SDK (client/src/profile.ts no repositório do jogo).
    // As 7 primeiras somam partidas (shared/src/clans.ts; 3 delas liberam clãs no jogo);
    // as outras são feitos de uma partida só (shared/src/feats.ts).
    achievements: withIcons(TRIBOS_ICONS, ".png", [
      { id: "primeira_vitoria", title: "Primeira vitória", description: "Vença uma partida.", tier: "comum" },
      { id: "saqueador_de_ruinas", title: "Saqueador de ruínas", description: "Vasculhe 5 ruínas.", tier: "comum" },
      { id: "cacador", title: "Caçador", description: "Derrote 15 tropas, somando as partidas.", tier: "rara" },
      { id: "limpa_trilhas", title: "Limpa-trilhas", description: "Destrua 3 acampamentos de saqueadores.", tier: "rara" },
      { id: "conquistador", title: "Conquistador", description: "Tome 20 aldeias ou cidades.", tier: "épica" },
      { id: "caudilho", title: "Caudilho", description: "Vença 10 partidas.", tier: "épica" },
      { id: "carrasco", title: "Carrasco", description: "Derrote 100 tropas, somando as partidas.", tier: "épica" },
      { id: "aprendiz", title: "Aprendiz", description: "Conclua a partida de treino.", tier: "comum" },
      { id: "metropole", title: "Metrópole", description: "Leve uma cidade ao nível IV.", tier: "comum" },
      { id: "diplomata", title: "Diplomata", description: "Firme uma trégua com outro clã.", tier: "comum" },
      { id: "sabio", title: "Sábio", description: "Aprenda todos os saberes numa única partida.", tier: "rara" },
      { id: "desafio_duro", title: "Osso duro", description: "Vença uma partida contra um bot difícil.", tier: "rara" },
      { id: "intocavel", title: "Intocável", description: "Vença sem perder nenhuma cidade.", tier: "rara" },
      { id: "ilheu", title: "Senhor das ilhas", description: "Vença uma partida no mapa de ilhas.", tier: "rara" },
      { id: "mestre_dos_clas", title: "Mestre dos clãs", description: "Vença com 5 clãs diferentes.", tier: "épica" },
      {
        id: "senhor_da_guerra",
        title: "Senhor da guerra",
        description: "Vença uma partida contra 4 bots difíceis.",
        tier: "épica",
        hidden: true,
      },
    ]),
    // banners de perfil pintados no Gemini, cada um liberado por uma conquista ligada a ele
    // avatares da loja: guerreiros dos clãs (folhas do Gemini do jogo); recortes de scripts/make-avatars.py
    avatars: [
      { id: "lanceiro", name: "Lanceiro", image: `${TRIBOS_AVATARS}lanceiro.jpg`, rarity: "comum" },
      { id: "musgo", name: "Guarda do musgo", image: `${TRIBOS_AVATARS}musgo.jpg`, rarity: "comum" },
      { id: "sentinela", name: "Sentinela", image: `${TRIBOS_AVATARS}sentinela.jpg`, rarity: "comum" },
      { id: "lobo", name: "Pele de lobo", image: `${TRIBOS_AVATARS}lobo.jpg`, rarity: "rara" },
      { id: "saqueador", name: "Saqueador", image: `${TRIBOS_AVATARS}saqueador.jpg`, rarity: "rara" },
      { id: "geada", name: "Arqueira da geada", image: `${TRIBOS_AVATARS}geada.jpg`, rarity: "rara" },
      { id: "sacerdote", name: "Sacerdote do sol", image: `${TRIBOS_AVATARS}sacerdote.jpg`, rarity: "épica" },
      { id: "corvo", name: "Mestre dos corvos", image: `${TRIBOS_AVATARS}corvo.jpg`, rarity: "épica" },
      { id: "sombra", name: "Sombra", image: `${TRIBOS_AVATARS}sombra.jpg`, rarity: "épica" },
    ],
    banners: [
      { id: "vale", title: "Vale do rio", image: `${TRIBOS_BANNERS}vale.jpg`, unlock: "primeira_vitoria" },
      { id: "ruinas", title: "Ruínas na névoa", image: `${TRIBOS_BANNERS}ruinas.jpg`, unlock: "saqueador_de_ruinas" },
      { id: "corvos", title: "Floresta dos corvos", image: `${TRIBOS_BANNERS}corvos.jpg`, unlock: "cacador" },
      { id: "geada", title: "Fiorde gelado", image: `${TRIBOS_BANNERS}geada.jpg`, unlock: "limpa_trilhas" },
      { id: "vitoria", title: "Estandarte erguido", image: `${TRIBOS_BANNERS}vitoria.jpg`, unlock: "conquistador" },
      { id: "cidadela", title: "Cidadela", image: `${TRIBOS_BANNERS}cidadela.jpg`, unlock: "metropole" },
      { id: "conselho", title: "Tenda do conselho", image: `${TRIBOS_BANNERS}conselho.jpg`, unlock: "diplomata" },
      { id: "saberes", title: "Casa dos saberes", image: `${TRIBOS_BANNERS}saberes.jpg`, unlock: "sabio" },
      { id: "arquipelago", title: "Arquipélago", image: `${TRIBOS_BANNERS}arquipelago.jpg`, unlock: "ilheu" },
      { id: "forja", title: "Forja do clã", image: `${TRIBOS_BANNERS}forja.jpg`, unlock: "caudilho" },
      { id: "trono", title: "Salão do trono", image: `${TRIBOS_BANNERS}trono.jpg`, unlock: "senhor_da_guerra" },
    ],
  },
  {
    id: "corre",
    title: "No Corre",
    // jogo só de cliente (sem servidor): o save fica no aparelho (localStorage "corre_save_v2")
    url: "",
    package: { manifest: "https://github.com/gg77studios/gg77-builds/releases/download/catalog/corre.json" },
    cover: "/games/corre/cover.jpg",
    banner: "/games/corre/banner.jpg",
    icon: "/games/corre/icon.png",
    tint: "#2a1d2e",
    tagline: "Toque uma lanchonete em pixel art: de dia atende, de noite fecha o caixa.",
    // ícones: sprites do próprio jogo em medalhas (pixel art)
    pixelArt: true,
    // O jogo manda estas conquistas pelo SDK (client/src/launcher.ts no repositório do jogo):
    // as metas do jogo (GOALS em shared/src/economy.ts) e alguns momentos.
    achievements: withIcons(CORRE_ICONS, ".png", [
      { id: "tutorial", title: "Aprendiz de chapeiro", description: "Termine o dia de treino.", tier: "comum" },
      { id: "primeiro-dia", title: "Portas abertas", description: "Feche o caixa do primeiro dia de verdade.", tier: "comum" },
      { id: "maquininha", title: "Aceita cartão", description: "Compre uma maquininha de cartão.", tier: "comum" },
      { id: "dia500", title: "Dia bom", description: "Venda R$ 500 num dia.", tier: "comum" },
      { id: "cardapio3", title: "Cardápio variado", description: "Tenha 3 itens no cardápio.", tier: "comum" },
      { id: "pesquisa", title: "Ouvindo o bairro", description: "Faça uma pesquisa de mercado.", tier: "comum" },
      { id: "app", title: "Tô no app", description: "Entre no app de delivery.", tier: "comum" },
      { id: "funcionario", title: "Primeira contratação", description: "Contrate o primeiro funcionário.", tier: "comum" },
      { id: "nota45", title: "Cinco estrelas", description: "Chegue na nota 4,5.", tier: "rara" },
      { id: "dia1500", title: "Casa cheia", description: "Venda R$ 1.500 num dia.", tier: "rara" },
      { id: "salinha", title: "Saiu da garagem", description: "Mude pra uma salinha no bairro.", tier: "rara" },
      { id: "me", title: "Agora é ME", description: "Vire ME no Simples Nacional.", tier: "rara" },
      { id: "mes-no-verde", title: "Mês no verde", description: "Feche um mês com lucro.", tier: "rara" },
      { id: "centro", title: "Loja no centro", description: "Abra a loja no centro.", tier: "épica" },
      { id: "mil", title: "Mil clientes", description: "Atenda 1.000 clientes.", tier: "épica" },
      { id: "influencer", title: "Influencer do bairro", description: "Chegue a 500 seguidores.", tier: "épica", hidden: true },
      // 0.6
      { id: "fiscal-aprovou", title: "Loja aprovada", description: "Passe pela vigilância sanitária sem multa.", tier: "comum" },
      { id: "cardapio6", title: "Cardápio de respeito", description: "Tenha 6 itens no cardápio.", tier: "rara" },
      { id: "fregueses", title: "Freguesia", description: "Tenha 3 fregueses fixos.", tier: "rara" },
      { id: "influencer-aprovou", title: "Aprovado pela influencer", description: "Atenda bem a influencer do bairro.", tier: "rara" },
      { id: "avenida", title: "Virou rede", description: "Abra a franquia na avenida.", tier: "épica" },
    ]),
    iconRules: [{ match: ".", icon: `${CORRE_ICONS}extra-default.png` }],
    // banners de perfil com a arte do jogo (Gemini)
    // avatares da loja: os personagens do jogo (sprites); recortes de scripts/make-avatars.py
    avatars: [
      { id: "cozinheiro", name: "Cozinheiro", image: `${CORRE_AVATARS}cozinheiro.png`, rarity: "comum" },
      { id: "cliente", name: "Cliente", image: `${CORRE_AVATARS}cliente.png`, rarity: "comum" },
    ],
    banners: [
      { id: "esquina", title: "Esquina ao entardecer", image: `${CORRE_BANNERS}esquina.jpg`, unlock: "primeiro-dia" },
      { id: "balcao", title: "Atrás do balcão", image: `${CORRE_BANNERS}balcao.jpg`, unlock: "mes-no-verde" },
    ],
  },
];

/** Banners do próprio launcher (arte gerada no Gemini), vendidos na loja. `unlock` é legado (migração). */
export const LAUNCHER_BANNERS: BannerDef[] = [
  { id: "padrao", title: "Padrão" },
  { id: "portao", title: "Portão da guilda", image: "/games/launcher/banners/portao.jpg", unlock: "bem-vindo" },
  { id: "colecao", title: "Estante da coleção", image: "/games/launcher/banners/colecao.jpg", unlock: "colecionador" },
  { id: "taverna", title: "Taverna dos amigos", image: "/games/launcher/banners/taverna.jpg", unlock: "fiel" },
  { id: "madrugada", title: "Madrugada", image: "/games/launcher/banners/madrugada.jpg", unlock: "maratona" },
  { id: "estrada", title: "Estrada", image: "/games/launcher/banners/estrada.jpg", unlock: "veterano" },
  { id: "trofeus", title: "Sala de troféus", image: "/games/launcher/banners/trofeus.jpg", unlock: "cacador" },
  // coleção sandbox (Gemini, scripts/make-avatars.py --indie-banners)
  { id: "mundo-blocos", title: "Mundo de blocos", image: "/games/launcher/banners/mundo-blocos.jpg", rarity: "rara", collection: "sandbox" },
  { id: "caverna-cristais", title: "Caverna de cristais", image: "/games/launcher/banners/caverna-cristais.jpg", rarity: "rara", collection: "sandbox" },
  { id: "ilhas-flutuantes", title: "Ilhas flutuantes", image: "/games/launcher/banners/ilhas-flutuantes.jpg", rarity: "épica", collection: "sandbox" },
  { id: "vila-neve", title: "Vila na neve", image: "/games/launcher/banners/vila-neve.jpg", rarity: "épica", collection: "sandbox" },
];

export const bannerRef = (gameId: string, bannerId: string) => `ref:${gameId}:${bannerId}`;

/** Conquistas do próprio launcher: liberadas pelo uso, sem precisar de integração. */
export const LAUNCHER_ID = "launcher";

export const LAUNCHER_ACHIEVEMENTS: AchievementDef[] = withIcons("/games/launcher/achievements/", ".jpg", [
  { id: "bem-vindo", title: "Bem-vindo à guilda", description: "Abra o launcher pela primeira vez.", tier: "comum" },
  { id: "primeira-partida", title: "Apertou o play", description: "Abra um jogo pelo launcher.", tier: "comum" },
  { id: "estilo-proprio", title: "Estilo próprio", description: "Troque o avatar, o banner, o tema ou a cor do launcher.", tier: "comum" },
  { id: "colecionador", title: "Colecionador", description: "Tenha 3 jogos na biblioteca.", tier: "comum" },
  { id: "fiel", title: "Frequentador", description: "Jogue em 3 dias diferentes.", tier: "rara" },
  { id: "maratona", title: "Maratona", description: "Fique 2 horas seguidas num jogo.", tier: "rara" },
  { id: "veterano", title: "Dez horas de estrada", description: "Some 10 horas de jogo.", tier: "épica" },
  { id: "cacador", title: "Caçador de troféus", description: "Libere 10 conquistas.", tier: "épica" },
  { id: "primeira-compra", title: "Primeira compra", description: "Compre um item na loja.", tier: "comum" },
]);

/** Avatares prontos do launcher (folha gerada no Gemini). Os seis primeiros vêm com a conta. */
export const LAUNCHER_AVATARS: AvatarDef[] = [
  { id: "cavaleira", name: "Cavaleira", image: "/games/launcher/avatars/cavaleira.jpg", rarity: "comum" },
  { id: "mago", name: "Mago", image: "/games/launcher/avatars/mago.jpg", rarity: "comum" },
  { id: "bardo", name: "Bardo", image: "/games/launcher/avatars/bardo.jpg", rarity: "comum" },
  { id: "arqueira", name: "Arqueira élfica", image: "/games/launcher/avatars/arqueira.jpg", rarity: "comum" },
  { id: "taverneiro", name: "Taverneiro", image: "/games/launcher/avatars/taverneiro.jpg", rarity: "comum" },
  { id: "ferreira", name: "Ferreira anã", image: "/games/launcher/avatars/ferreira.jpg", rarity: "comum" },
  { id: "ladino", name: "Ladino", image: "/games/launcher/avatars/ladino.jpg", rarity: "rara" },
  { id: "cleriga", name: "Clériga", image: "/games/launcher/avatars/cleriga.jpg", rarity: "rara" },
  { id: "orc", name: "Orc camarada", image: "/games/launcher/avatars/orc.jpg", rarity: "rara" },
  { id: "gato", name: "Gato aventureiro", image: "/games/launcher/avatars/gato.jpg", rarity: "épica" },
  { id: "golem", name: "Golem de cristal", image: "/games/launcher/avatars/golem.jpg", rarity: "épica" },
  { id: "dragao", name: "Dragãozinho", image: "/games/launcher/avatars/dragao.jpg", rarity: "lendária" },
  // coleção sandbox: personagens originais em voxel e pixel art (Gemini, scripts/make-avatars.py --indie-avatars)
  { id: "minerador", name: "Minerador de blocos", image: "/games/launcher/avatars/minerador.jpg", rarity: "comum", collection: "sandbox" },
  { id: "aldea", name: "Aldeã de blocos", image: "/games/launcher/avatars/aldea.jpg", rarity: "comum", collection: "sandbox" },
  { id: "esqueleto", name: "Esqueleto arqueiro", image: "/games/launcher/avatars/esqueleto.jpg", rarity: "rara", collection: "sandbox" },
  { id: "abelha", name: "Abelha cúbica", image: "/games/launcher/avatars/abelha.jpg", rarity: "rara", collection: "sandbox" },
  { id: "lobo", name: "Lobo de lenço", image: "/games/launcher/avatars/lobo.jpg", rarity: "rara", collection: "sandbox" },
  { id: "cavaleiro-cristal", name: "Cavaleiro de cristal", image: "/games/launcher/avatars/cavaleiro-cristal.jpg", rarity: "épica", collection: "sandbox" },
  { id: "explorador", name: "Explorador de cavernas", image: "/games/launcher/avatars/explorador.jpg", rarity: "comum", collection: "sandbox" },
  { id: "slime", name: "Slime", image: "/games/launcher/avatars/slime.jpg", rarity: "comum", collection: "sandbox" },
  { id: "cogumelo", name: "Cogumelo andante", image: "/games/launcher/avatars/cogumelo.jpg", rarity: "rara", collection: "sandbox" },
  { id: "fantasma", name: "Fantasminha", image: "/games/launcher/avatars/fantasma.jpg", rarity: "rara", collection: "sandbox" },
  { id: "fada", name: "Fada das folhas", image: "/games/launcher/avatars/fada.jpg", rarity: "épica", collection: "sandbox" },
  { id: "mago-estrelado", name: "Mago estrelado", image: "/games/launcher/avatars/mago-estrelado.jpg", rarity: "épica", collection: "sandbox" },
];

export const TIER_XP: Record<Tier, number> = { comum: 10, rara: 25, épica: 50 };

export const XP_PER_LEVEL = 100;

export const ACCENTS = [
  { name: "Neon", value: "#d4ff3f" },
  { name: "Coral", value: "#ff6b4a" },
  { name: "Gelo", value: "#5ad8ff" },
  { name: "Chiclete", value: "#ff5fa2" },
  { name: "Âmbar", value: "#ffb020" },
  { name: "Lavanda", value: "#a78bfa" },
];

export const AVATAR_PRESETS = [
  { bg: "#d4ff3f", fg: "#14161b" },
  { bg: "#ff6b4a", fg: "#14161b" },
  { bg: "#5ad8ff", fg: "#14161b" },
  { bg: "#ff5fa2", fg: "#14161b" },
  { bg: "#ffb020", fg: "#14161b" },
  { bg: "#a78bfa", fg: "#14161b" },
];

export const DEFAULT_STATE: Persisted = {
  profile: { nickname: "Jogador", bio: "", avatarId: "avatar:ini-0", showcase: [], frame: "frame:vidro", inventory: [], grants: [] },
  settings: {
    theme: "grafite",
    accent: ACCENTS[0].value,
    ambient: true,
    wallpaper: "wallpaper:degrade",
    glass: "liquido",
    sound: true,
    notifications: true,
    library: { layout: "carrossel", size: "m", sort: "padrao" },
    sidebar: { mode: "expandida", side: "esquerda" },
    font: "figtree",
    density: "confortavel",
    corners: "arredondado",
    motion: "tudo",
  },
  customGames: [],
  overrides: {},
  stats: {},
  unlocks: {},
  playDays: [],
  selectedGame: CATALOG[0].id,
};

export const unlockKey = (gameId: string, id: string) => `${gameId}:${id}`;

export function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "jogo"
  );
}
