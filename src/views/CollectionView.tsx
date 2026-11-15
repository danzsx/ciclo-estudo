import React, { useMemo, useState } from "react";
import { Compass, Filter, ArrowUpDown, RotateCcw, Award, BookOpen, Layers } from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  ATLAS_CATALOG,
  ATLAS_COLLECTIONS,
  CATEGORY_META,
  RARITY_META,
  getCollectionProgress,
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
import { soundEngine } from "../audio";

const CATEGORY_ORDER: AchievementCategory[] = ["constancy", "dedication", "cycles", "special"];
const RARITY_ORDER: AchievementRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const CollectionView: React.FC = () => {
  const { data, searchQuery } = useApp();

  const [viewMode, setViewMode] = useState<"biomes" | "categories">("biomes");
  const [collectionFilter, setCollectionFilter] = useState<string | "all">("all");
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
  const collectionProgress = useMemo(() => getCollectionProgress(unlockedList), [unlockedList]);

  const filteredCards = useMemo(
    () =>
      queryAtlasCards(unlockedList, {
        category: categoryFilter,
        collection: collectionFilter,
        rarity: rarityFilter,
        status: statusFilter,
        sortBy,
        search: searchQuery,
      }),
    [unlockedList, categoryFilter, collectionFilter, rarityFilter, statusFilter, sortBy, searchQuery],
  );

  const groupedByBiome = useMemo(() => {
    if (viewMode !== "biomes" || collectionFilter !== "all" || categoryFilter !== "all" || sortBy !== "id") {
      return null;
    }
    return collectionProgress
      .map((prog) => {
        const items = filteredCards.filter((c) =>
          c.definition.collections.includes(prog.collection.id),
        );
        return {
          ...prog,
          items,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [viewMode, collectionFilter, categoryFilter, sortBy, collectionProgress, filteredCards]);

  const groupedByCategory = useMemo(() => {
    if (viewMode !== "categories" || categoryFilter !== "all" || sortBy !== "id") return null;
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
  }, [viewMode, categoryFilter, sortBy, filteredCards, unlockedSet]);

  const hasActiveFilters =
    collectionFilter !== "all" ||
    categoryFilter !== "all" ||
    rarityFilter !== "all" ||
    statusFilter !== "all" ||
    sortBy !== "id";

  const resetFilters = () => {
    setCollectionFilter("all");
    setCategoryFilter("all");
    setRarityFilter("all");
    setStatusFilter("all");
    setSortBy("id");
    void soundEngine.play("ui-select");
  };

  const handleSelectCard = (definition: AchievementDefinition, unlocked?: UnlockedAchievement) => {
    setSelectedCard({ definition, unlocked });
    void soundEngine.play("atlas-card-detail");
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

      {/* Thematic Bestiary Collections Strip */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <BookOpen size={15} style={{ color: "var(--brand-sage-dark)" }} />
            <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Álbum do Bestiário · Coleções Temáticas & Biomas
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              padding: "0.2rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--bg-surface-subtle)",
              border: "1px solid var(--border-subtle)",
              gap: "0.2rem",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setViewMode("biomes");
                void soundEngine.play("ui-tab");
              }}
              style={{
                padding: "0.28rem 0.72rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.74rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: viewMode === "biomes" ? "var(--bg-surface)" : "transparent",
                color: viewMode === "biomes" ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: viewMode === "biomes" ? "var(--shadow-sm)" : "none",
              }}
            >
              Por Biomas
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("categories");
                void soundEngine.play("ui-tab");
              }}
              style={{
                padding: "0.28rem 0.72rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.74rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: viewMode === "categories" ? "var(--bg-surface)" : "transparent",
                color: viewMode === "categories" ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: viewMode === "categories" ? "var(--shadow-sm)" : "none",
              }}
            >
              Por Categorias
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {collectionProgress.map((prog) => {
            const isSelected = collectionFilter === prog.collection.id;
            return (
              <button
                key={prog.collection.id}
                type="button"
                onClick={() => {
                  setCollectionFilter((prev) =>
                    prev === prog.collection.id ? "all" : prog.collection.id,
                  );
                  void soundEngine.play("ui-select");
                }}
                className="editorial-card"
                style={{
                  textAlign: "left",
                  padding: "0.85rem 0.95rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  cursor: "pointer",
                  border: isSelected
                    ? `1.5px solid ${prog.collection.accent}`
                    : prog.completed
                      ? "1px solid rgba(115, 186, 155, 0.55)"
                      : "1px solid var(--border-subtle)",
                  backgroundColor: isSelected ? "var(--bg-surface-subtle)" : "var(--bg-surface)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {prog.collection.name}
                  </span>
                  {prog.completed && (
                    <span
                      title="Coleção temática completa — Selo conquistado"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        padding: "0.1rem 0.42rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: "rgba(115, 186, 155, 0.16)",
                        color: "var(--brand-sage-dark)",
                        border: "1px solid rgba(115, 186, 155, 0.4)",
                      }}
                    >
                      <Award size={10} />
                      Completa
                    </span>
                  )}
                </div>

                <div
                  style={{
                    height: 6,
                    width: "100%",
                    borderRadius: 999,
                    backgroundColor: "var(--bg-surface-subtle)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${prog.pct}%`,
                      height: "100%",
                      backgroundColor: prog.collection.accent,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <div
                  className="tabular-nums"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  <span>
                    {prog.unlocked}/{prog.total} espécies
                  </span>
                  <span>{prog.pct}%</span>
                </div>
              </button>
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
            aria-label="Filtrar por bioma ou coleção"
            value={collectionFilter}
            onChange={(e) => {
              setCollectionFilter(e.target.value);
              void soundEngine.play("ui-select");
            }}
            className="select"
            style={{ width: "auto", padding: "0.42rem 0.75rem", fontSize: "0.8rem" }}
          >
            <option value="all">Todos os biomas</option>
            {ATLAS_COLLECTIONS.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por categoria"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as AchievementCategory | "all");
              void soundEngine.play("ui-select");
            }}
            className="select"
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
            onChange={(e) => {
              setRarityFilter(e.target.value as AchievementRarity | "all");
              void soundEngine.play("ui-select");
            }}
            className="select"
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
            onChange={(e) => {
              setStatusFilter(e.target.value as AtlasStatusFilter);
              void soundEngine.play("ui-select");
            }}
            className="select"
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
            onChange={(e) => {
              setSortBy(e.target.value as AtlasSortBy);
              void soundEngine.play("ui-select");
            }}
            className="select"
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
      ) : groupedByBiome ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
          {groupedByBiome.map((group) => (
            <section key={group.collection.id} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "0.6rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Layers size={15} style={{ color: group.collection.accent }} />
                    <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                      {group.collection.name}
                    </h2>
                    {group.completed && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.24rem",
                          fontSize: "0.66rem",
                          fontWeight: 700,
                          padding: "0.14rem 0.5rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "rgba(115, 186, 155, 0.16)",
                          color: "var(--brand-sage-dark)",
                          border: "1px solid rgba(115, 186, 155, 0.4)",
                        }}
                      >
                        <Award size={11} />
                        Coleção Completa
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                    {group.collection.subtitle}
                  </p>
                </div>

                <div className="tabular-nums" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: 96,
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: "var(--bg-surface-subtle)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${group.pct}%`,
                        height: "100%",
                        backgroundColor: group.collection.accent,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
                    {group.unlocked}/{group.total} ({group.pct}%)
                  </span>
                </div>
              </div>

              <div className="atlas-grid">
                {group.items.map(({ definition, unlocked }) => (
                  <AtlasCard
                    key={`${group.collection.id}-${definition.id}`}
                    definition={definition}
                    unlocked={unlocked}
                    onSelect={handleSelectCard}
                  />
                ))}
              </div>
            </section>
          ))}
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
                    onSelect={handleSelectCard}
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
              onSelect={handleSelectCard}
            />
          ))}
        </div>
      )}

      {selectedCard && (
        <AtlasCardModal
          definition={selectedCard.definition}
          unlocked={selectedCard.unlocked}
          onClose={() => {
            setSelectedCard(null);
            void soundEngine.play("ui-modal-close");
          }}
        />
      )}
    </div>
  );
};

