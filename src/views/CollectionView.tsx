import React, { useMemo, useState } from "react";
import { Compass, Filter, ArrowUpDown, RotateCcw } from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  ATLAS_CATALOG,
  CATEGORY_META,
  RARITY_META,
  queryAtlasCards,
  type AchievementCategory,
  type AchievementDefinition,
  type AchievementRarity,
  type AtlasSortBy,
  type AtlasStatusFilter,
  type UnlockedAchievement,
} from "../core";
import { AtlasCard, RARITY_STYLES } from "../components/AtlasCard";
import { AtlasCardModal } from "../components/AtlasCardModal";

const CATEGORY_ORDER: AchievementCategory[] = ["constancy", "dedication", "cycles", "special"];
const RARITY_ORDER: AchievementRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const CollectionView: React.FC = () => {
  const { data, searchQuery } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<AchievementCategory | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<AchievementRarity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AtlasStatusFilter>("all");
  const [sortBy, setSortBy] = useState<AtlasSortBy>("id");
  const [selectedCard, setSelectedCard] = useState<{
    definition: AchievementDefinition;
    unlocked?: UnlockedAchievement;
  } | null>(null);

  const unlockedList = data.atlas?.unlocked ?? [];
  const totalCount = ATLAS_CATALOG.length;
  const unlockedCount = unlockedList.length;
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const unlockedSet = useMemo(() => new Set(unlockedList.map((u) => u.id)), [unlockedList]);

  const filteredCards = useMemo(
    () =>
      queryAtlasCards(unlockedList, {
        category: categoryFilter,
        rarity: rarityFilter,
        status: statusFilter,
        sortBy,
        search: searchQuery,
      }),
    [unlockedList, categoryFilter, rarityFilter, statusFilter, sortBy, searchQuery],
  );

  const groupedByCategory = useMemo(() => {
    if (categoryFilter !== "all" || sortBy !== "id") return null;
    return CATEGORY_ORDER.map((cat) => {
      const items = filteredCards.filter((c) => c.definition.category === cat);
      const totalInCategory = ATLAS_CATALOG.filter((d) => d.category === cat).length;
      const unlockedInCategory = ATLAS_CATALOG.filter(
        (d) => d.category === cat && unlockedSet.has(d.id),
      ).length;
      return {
        category: cat,
        meta: CATEGORY_META[cat],
        items,
        totalInCategory,
        unlockedInCategory,
      };
    }).filter((g) => g.items.length > 0);
  }, [categoryFilter, sortBy, filteredCards, unlockedSet]);

  const hasActiveFilters =
    categoryFilter !== "all" || rarityFilter !== "all" || statusFilter !== "all" || sortBy !== "id";

  const resetFilters = () => {
    setCategoryFilter("all");
    setRarityFilter("all");
    setStatusFilter("all");
    setSortBy("id");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: 1120, margin: "0 auto" }}>
      {/* Editorial Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "1.15rem",
        }}
      >
        <div>
          <div className="section-kicker">ATLAS · Arquivo Pessoal</div>
          <h1 className="section-hero-title">
            Coleção de{" "}
            <span className="serif-accent" style={{ fontSize: "1.9rem", fontWeight: 400 }}>
              Conquistas
            </span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
            Arquivo permanente de realizações acadêmicas. Cada marco real desbloqueia uma carta colecionável.
          </p>
        </div>

        {/* High-level KPI Strip */}
        <div className="tabular-nums" style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
              Desbloqueadas
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em" }}>
              {unlockedCount}
              <span style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--text-muted)" }}>
                /{totalCount}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
              Conclusão
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 700, color: "var(--brand-sage-dark)", letterSpacing: "-0.025em" }}>
              {completionPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Rarity Summary Card */}
      <div
        className="editorial-card"
        style={{
          padding: "1.25rem 1.4rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <Compass size={17} style={{ color: "var(--brand-sage-dark)" }} />
            <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Progresso do Arquivo Fundamental
            </span>
          </div>
          <span className="tabular-nums" style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            {totalCount - unlockedCount === 0
              ? "Coleção completa"
              : `${totalCount - unlockedCount} cartas restantes para completar`}
          </span>
        </div>

        {/* Dual-tone Editorial Progress Track */}
        <div
          style={{
            height: 9,
            width: "100%",
            borderRadius: 999,
            backgroundColor: "var(--bg-surface-subtle)",
            overflow: "hidden",
            display: "flex",
          }}
        >
          <div
            style={{
              width: `${completionPct}%`,
              backgroundColor: "#73ba9b",
              transition: "width 0.3s ease",
            }}
          />
          {completionPct < 100 && unlockedCount > 0 && (
            <div style={{ width: "3%", backgroundColor: "#f7a072" }} />
          )}
        </div>

        {/* Rarity Breakdown */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {RARITY_ORDER.map((r) => {
            const totalR = ATLAS_CATALOG.filter((d) => d.rarity === r).length;
            const unlockedR = ATLAS_CATALOG.filter((d) => d.rarity === r && unlockedSet.has(d.id)).length;
            const rStyle = RARITY_STYLES[r];
            return (
              <div
                key={r}
                className="tabular-nums"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  padding: "0.3rem 0.7rem",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: rStyle.badgeBg,
                  color: rStyle.badgeText,
                  border: `1px solid ${rStyle.badgeBorder}`,
                }}
              >
                <span>{RARITY_META[r].label}</span>
                <span style={{ opacity: 0.85 }}>
                  {unlockedR}/{totalR}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters & Sorting Toolbar */}
      <div
        className="editorial-card"
        style={{
          padding: "1rem 1.25rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.85rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              marginRight: "0.25rem",
            }}
          >
            <Filter size={14} />
            Filtros
          </span>

          <select
            aria-label="Filtrar por categoria"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as AchievementCategory | "all")}
            className="input-field"
            style={{ width: "auto", padding: "0.42rem 0.75rem", fontSize: "0.8rem" }}
          >
            <option value="all">Todas as categorias</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por raridade"
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as AchievementRarity | "all")}
            className="input-field"
            style={{ width: "auto", padding: "0.42rem 0.75rem", fontSize: "0.8rem" }}
          >
            <option value="all">Todas as raridades</option>
            {RARITY_ORDER.map((r) => (
              <option key={r} value={r}>
                {RARITY_META[r].label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AtlasStatusFilter)}
            className="input-field"
            style={{ width: "auto", padding: "0.42rem 0.75rem", fontSize: "0.8rem" }}
          >
            <option value="all">Todos os estados</option>
            <option value="unlocked">Desbloqueadas</option>
            <option value="locked">Bloqueadas</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "var(--text-muted)",
            }}
          >
            <ArrowUpDown size={14} />
            Ordenar
          </span>
          <select
            aria-label="Ordenar cartas"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as AtlasSortBy)}
            className="input-field"
            style={{ width: "auto", padding: "0.42rem 0.75rem", fontSize: "0.8rem" }}
          >
            <option value="id">Ordem de identificação</option>
            <option value="date">Data de aquisição</option>
            <option value="rarity">Raridade</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-secondary"
              onClick={resetFilters}
              style={{ padding: "0.42rem 0.75rem", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <RotateCcw size={13} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Cards Display */}
      {filteredCards.length === 0 ? (
        <div
          className="editorial-card"
          style={{
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
          }}
        >
          Nenhuma carta encontrada para os filtros selecionados.
        </div>
      ) : groupedByCategory ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
          {groupedByCategory.map((group) => (
            <section key={group.category} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "0.55rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                    {group.meta.label}
                  </h2>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.1rem" }}>
                    {group.meta.subtitle}
                  </p>
                </div>
                <span className="tabular-nums" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  {group.unlockedInCategory}/{group.totalInCategory} desbloqueadas
                </span>
              </div>

              <div className="atlas-grid">
                {group.items.map(({ definition, unlocked }) => (
                  <AtlasCard
                    key={definition.id}
                    definition={definition}
                    unlocked={unlocked}
                    onSelect={(def, unl) => setSelectedCard({ definition: def, unlocked: unl })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="atlas-grid">
          {filteredCards.map(({ definition, unlocked }) => (
            <AtlasCard
              key={definition.id}
              definition={definition}
              unlocked={unlocked}
              onSelect={(def, unl) => setSelectedCard({ definition: def, unlocked: unl })}
            />
          ))}
        </div>
      )}

      {selectedCard && (
        <AtlasCardModal
          definition={selectedCard.definition}
          unlocked={selectedCard.unlocked}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
};

