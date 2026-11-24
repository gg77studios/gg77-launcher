import { Check, Coins, LockSimple, Sparkle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ItemPreview, WallpaperSwatch, wearing } from "../components/ItemPreview";
import { ProfileCard } from "../components/ProfileCard";
import { LAUNCHER_ID } from "../lib/catalog";
import { type ShopTab, tabOf, useNav } from "../lib/nav";
import { COINS_PER_HOUR, COINS_PER_LEVEL, dailyFeatured, fmtCoins, itemValue, LIGHT_THEMES, RARITIES } from "../lib/shop";
import { useStore } from "../lib/state";
import type { ItemKind, Rarity, ShopItem } from "../lib/types";

const TABS: Array<{ id: ShopTab; label: string }> = [
  { id: "avatar", label: "Avatares" },
  { id: "banner", label: "Banners" },
  { id: "frame", label: "Molduras" },
  { id: "fx", label: "Efeitos" },
  { id: "nameStyle", label: "Nomes" },
  { id: "theme", label: "Temas" },
  { id: "wallpaper", label: "Fundos" },
];

const KIND_LABEL: Record<ItemKind, string> = {
  avatar: "Avatar",
  banner: "Banner",
  frame: "Moldura",
  avatarFx: "Efeito de avatar",
  bannerFx: "Efeito de banner",
  nameStyle: "Estilo de nome",
  theme: "Tema",
  wallpaper: "Fundo",
};

const RANK: Record<Rarity, number> = { comum: 0, rara: 1, épica: 2, lendária: 3 };

export function RarityTag({ rarity }: { rarity: Rarity }) {
  return (
    <span className="rarity" data-rarity={rarity}>
      {rarity}
    </span>
  );
}

export function CoinAmount({ n, big }: { n: number; big?: boolean }) {
  return (
    <span className="coins" data-big={big || undefined}>
      <Coins size={big ? 18 : 14} weight="fill" aria-hidden />
      {n.toLocaleString("pt-BR")}
    </span>
  );
}

/** Se o item está em uso agora (no perfil ou no launcher). */
export function useEquipped() {
  const { state } = useStore();
  const p = state.profile;
  const s = state.settings;
  return (it: ShopItem) => {
    switch (it.kind) {
      case "avatar":
        return p.avatarId === it.id;
      case "banner":
        return p.banner === it.id;
      case "frame":
        return p.frame === it.id;
      case "avatarFx":
        return p.avatarFx === it.id;
      case "bannerFx":
        return p.bannerFx === it.id;
      case "nameStyle":
        return p.nameStyle === it.id;
      case "theme":
        return s.theme === itemValue(it.id);
      case "wallpaper":
        return !s.ambient && s.wallpaper === it.id;
    }
  };
}

export function ShopView() {
  const { shop, owns, wallet, gameTitle } = useStore();
  const { shopIntent } = useNav();
  const [tab, setTab] = useState<ShopTab>(shopIntent?.tab ?? "avatar");
  const [rarity, setRarity] = useState<Rarity | "todas">("todas");
  const [hideOwned, setHideOwned] = useState(false);
  const [game, setGame] = useState<string>(shopIntent?.gameId ?? "todos");
  const [open, setOpen] = useState<ShopItem | null>(null);
  const [earnOpen, setEarnOpen] = useState(false);

  // pedido vindo de outra tela (Perfil, Biblioteca): abre na aba/jogo certo
  useEffect(() => {
    if (!shopIntent) return;
    if (shopIntent.tab) setTab(shopIntent.tab);
    setGame(shopIntent.gameId ?? "todos");
  }, [shopIntent]);

  // sorteio do dia entre o que a pessoa ainda não tem
  const featured = useMemo(() => dailyFeatured(shop.filter((i) => !owns(i.id))), [shop, owns]);
  const inTab = shop.filter((i) => tabOf(i.kind) === tab);
  const hasGames = tab === "avatar" || tab === "banner";
  const gameIds = hasGames ? [...new Set(inTab.map((i) => i.gameId).filter((g): g is string => !!g))] : [];
  const list = inTab
    .filter((i) => rarity === "todas" || i.rarity === rarity)
    .filter((i) => !hideOwned || !owns(i.id))
    .filter((i) => !hasGames || game === "todos" || i.gameId === game)
    .sort((a, b) => Number(owns(a.id)) - Number(owns(b.id)) || RANK[a.rarity] - RANK[b.rarity] || a.price - b.price);

  const owned = inTab.filter((i) => owns(i.id)).length;
  const label = (id: string) => (id === LAUNCHER_ID ? "GG77" : gameTitle(id));

  return (
    <div className="shop">
      <header className="shop-head">
        <div>
          <h1 className="page-title">Loja</h1>
          <p className="muted">Fichas saem de conquistas, horas jogadas e níveis. Tudo aqui é visual, para montar o perfil e o launcher.</p>
        </div>
        <div className="wallet glass">
          <span className="wallet-label">Suas fichas</span>
          <CoinAmount n={wallet.balance} big />
          <button type="button" className="link-btn" onClick={() => setEarnOpen((v) => !v)} aria-expanded={earnOpen}>
            Como ganhar
          </button>
          <AnimatePresence>
            {earnOpen && (
              <motion.dl
                className="wallet-breakdown glass"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <div>
                  <dt>Conquistas</dt>
                  <dd>
                    {fmtCoins(wallet.fromAchievements)}
                    <small>10 comum · 25 rara · 50 épica</small>
                  </dd>
                </div>
                <div>
                  <dt>Horas jogadas</dt>
                  <dd>
                    {fmtCoins(wallet.fromHours)}
                    <small>{COINS_PER_HOUR} por hora cheia</small>
                  </dd>
                </div>
                <div>
                  <dt>Níveis</dt>
                  <dd>
                    {fmtCoins(wallet.fromLevels)}
                    <small>{COINS_PER_LEVEL} por nível</small>
                  </dd>
                </div>
                <div>
                  <dt>Gastas</dt>
                  <dd>{fmtCoins(wallet.spent)}</dd>
                </div>
              </motion.dl>
            )}
          </AnimatePresence>
        </div>
      </header>

      {featured.length > 0 && (
        <section className="featured" aria-label="Destaques do dia">
          <h2 className="shop-sub">
            <Sparkle size={16} weight="fill" aria-hidden /> Destaques do dia
          </h2>
          <div className="featured-row">
            {featured.map((it) => (
              <ItemCard key={it.id} it={it} big onOpen={() => setOpen(it)} />
            ))}
          </div>
        </section>
      )}

      <div className="shop-bar">
        <div className="segmented glass glass--field shop-tabs" role="tablist" aria-label="Categorias">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-checked={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setGame("todos");
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="muted shop-count">
          {owned} de {inTab.length} na coleção
        </span>
      </div>

      <div className="shop-filters">
        <div className="chips" role="radiogroup" aria-label="Raridade">
          {(["todas", ...RARITIES] as const).map((r) => (
            <button key={r} type="button" role="radio" className="chip" data-rarity={r} aria-checked={rarity === r} onClick={() => setRarity(r)}>
              {r === "todas" ? "Todas" : r}
            </button>
          ))}
        </div>
        {hasGames && gameIds.length > 1 && (
          <div className="chips" role="radiogroup" aria-label="Jogo">
            <button type="button" role="radio" className="chip" aria-checked={game === "todos"} onClick={() => setGame("todos")}>
              Todos os jogos
            </button>
            {gameIds.map((g) => (
              <button key={g} type="button" role="radio" className="chip" aria-checked={game === g} onClick={() => setGame(g)}>
                {label(g)}
              </button>
            ))}
          </div>
        )}
        <label className="chip chip--check">
          <input type="checkbox" checked={hideOwned} onChange={(e) => setHideOwned(e.target.checked)} />
          Esconder o que já tenho
        </label>
      </div>

      {list.length ? (
        <ul className="shop-grid" data-kind={tab}>
          {list.map((it) => (
            <li key={it.id}>
              <ItemCard it={it} onOpen={() => setOpen(it)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted shop-empty">{hideOwned ? "Você já tem tudo daqui." : "Nada com esse filtro."}</p>
      )}

      {open && <TryOn it={open} onClose={() => setOpen(null)} gameName={open.gameId ? label(open.gameId) : undefined} />}
    </div>
  );
}

function ItemCard({ it, big, onOpen }: { it: ShopItem; big?: boolean; onOpen: () => void }) {
  const { owns, canBuy } = useStore();
  const equipped = useEquipped();
  const [hover, setHover] = useState(false);
  const has = owns(it.id);
  const block = canBuy(it);
  return (
    <button
      type="button"
      className="item-card"
      data-big={big || undefined}
      data-kind={it.kind}
      data-rarity={it.rarity}
      data-owned={has || undefined}
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <span className="item-stage">
        <ItemPreview it={it} live={hover} size={big ? 96 : 76} />
      </span>
      <span className="item-info">
        <strong>{it.name}</strong>
        <span className="item-meta">
          <RarityTag rarity={it.rarity} />
          {big && <span className="muted">{KIND_LABEL[it.kind]}</span>}
        </span>
      </span>
      <span className="item-price">
        {equipped(it) ? (
          <span className="item-state" data-on>
            <Check size={13} weight="bold" aria-hidden /> Em uso
          </span>
        ) : has ? (
          <span className="item-state">
            <Check size={13} weight="bold" aria-hidden /> Tenho
          </span>
        ) : block?.reason === "level" ? (
          <span className="item-state" data-locked>
            <LockSimple size={13} weight="bold" aria-hidden /> Nível {it.minLevel}
          </span>
        ) : (
          <span data-short={block?.reason === "coins" || undefined}>
            <CoinAmount n={it.price} />
          </span>
        )}
      </span>
    </button>
  );
}

const BURST = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);

/** Provador: o item no próprio perfil, com comprar e usar. */
function TryOn({ it, onClose, gameName }: { it: ShopItem; onClose: () => void; gameName?: string }) {
  const { state, owns, canBuy, buy, equip, wallet, level, titleText } = useStore();
  const equipped = useEquipped();
  const ref = useRef<HTMLDialogElement>(null);
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const has = owns(it.id);
  const block = canBuy(it);
  const using = equipped(it);
  const removable = it.kind !== "avatar" && it.kind !== "theme" && it.kind !== "wallpaper";
  const profileKinds: ItemKind[] = ["avatar", "banner", "frame", "avatarFx", "bannerFx", "nameStyle"];

  const purchase = (andUse: boolean) => {
    if (!buy(it)) return;
    if (!reduce) setBurst((b) => b + 1);
    if (andUse) equip(it.kind, it.id, true);
  };

  const theme = itemValue(it.id);

  return (
    <dialog ref={ref} className="dialog dialog--wide tryon" aria-labelledby="tryon-title" onClose={onClose} onCancel={onClose}>
      <div className="dialog-head">
        <div>
          <h2 id="tryon-title">{it.name}</h2>
          <div className="item-meta">
            <RarityTag rarity={it.rarity} />
            <span className="muted">
              {KIND_LABEL[it.kind]}
              {gameName ? ` · ${gameName}` : ""}
            </span>
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar" title="Fechar">
          <X size={18} />
        </button>
      </div>

      <div className="tryon-stage">
        {profileKinds.includes(it.kind) ? (
          <ProfileCard profile={wearing(state.profile, it)} level={level} titleText={titleText} live />
        ) : it.kind === "theme" ? (
          <div className="mock" data-theme={theme} data-light={LIGHT_THEMES.has(theme) || undefined}>
            <span className="mock-side glass" />
            <span className="mock-main">
              <span className="mock-hero" />
              <span className="mock-row">
                <i className="glass" />
                <i className="glass" />
                <i className="glass" />
              </span>
            </span>
          </div>
        ) : (
          <div className="tryon-wall">
            <WallpaperSwatch id={it.id} image={it.image} />
          </div>
        )}
        <AnimatePresence>
          {burst > 0 && (
            <motion.span key={burst} className="burst" aria-hidden initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.6, duration: 0.4 }}>
              {BURST.map((a) => (
                <motion.i
                  key={a}
                  initial={{ x: 0, y: 0, scale: 1 }}
                  animate={{ x: Math.cos((a * Math.PI) / 180) * 140, y: Math.sin((a * Math.PI) / 180) * 110, scale: 0.3 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {it.description && <p className="tryon-desc">{it.description}</p>}

      <div className="tryon-foot">
        <span className="muted">
          Você tem <CoinAmount n={wallet.balance} />
          {block && block.reason !== "owned" && <b className="tryon-block"> · {block.text}</b>}
        </span>
        <div className="tryon-actions">
          {has ? (
            using ? (
              removable ? (
                <button type="button" className="btn btn--ghost" onClick={() => equip(it.kind, undefined)}>
                  Tirar
                </button>
              ) : (
                <span className="item-state" data-on>
                  <Check size={14} weight="bold" aria-hidden /> Em uso
                </span>
              )
            ) : (
              <button type="button" className="btn btn--accent" onClick={() => equip(it.kind, it.id)}>
                Usar
              </button>
            )
          ) : (
            <>
              <button type="button" className="btn btn--ghost" disabled={!!block} onClick={() => purchase(false)}>
                Comprar por <CoinAmount n={it.price} />
              </button>
              <button type="button" className="btn btn--accent" disabled={!!block} onClick={() => purchase(true)}>
                Comprar e usar
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
