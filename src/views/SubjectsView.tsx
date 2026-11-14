import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Clock,
  AlertTriangle,
  X,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  DIFFICULTY_LABELS,
  WEIGHT_LABELS,
  SUBJECT_COLORS,
  formatMinutes,
  type Difficulty,
  type Subject,
  type SubjectInput,
} from "../core";
import { getSubjectVisual, formatTiimoDuration } from "../utils/visuals";
import { SubjectIcon } from "../components/SubjectIcon";

export const SubjectsView: React.FC = () => {
  const {
    data,
    handleAddSubject,
    handleUpdateSubject,
    handleDeleteSubject,
    handleMoveSubject,
    handleLoadDemo,
    handleRemoveDemo,
    hasDemoSubjects,
    subjectStatsData,
    searchQuery,
    handleJumpTo,
    setActiveTab,
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [sessionCustom, setSessionCustom] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(50);
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingSubject(null);
    setName("");
    setWeight(3);
    setDifficulty("medium");
    setSessionCustom(false);
    setSessionMinutes(data.settings.sessionMinutes);
    setColor(SUBJECT_COLORS[data.subjects.length % SUBJECT_COLORS.length]);
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (s: Subject) => {
    setEditingSubject(s);
    setName(s.name);
    setWeight(s.weight);
    setDifficulty(s.difficulty);
    setSessionCustom(s.sessionMinutes !== null);
    setSessionMinutes(s.sessionMinutes ?? data.settings.sessionMinutes);
    setColor(s.color);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const input: SubjectInput = {
      name,
      weight,
      difficulty,
      sessionMinutes: sessionCustom ? sessionMinutes : null,
      color,
    };

    if (editingSubject) {
      const res = handleUpdateSubject(editingSubject.id, input);
      if (res.ok) {
        setModalOpen(false);
      } else if (res.errors) {
        setErrors(res.errors);
      }
    } else {
      const res = handleAddSubject(input);
      if (res.ok) {
        setModalOpen(false);
      } else if (res.errors) {
        setErrors(res.errors);
      }
    }
  };

  const filteredSubjects = data.subjects.filter((s) => {
    if (!searchQuery) return true;
    return s.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: 1120, margin: "0 auto" }}>
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
          <div className="section-kicker">Acervo Curricular</div>
          <h1 className="section-hero-title">
            Biblioteca de{" "}
            <span className="serif-accent" style={{ fontSize: "1.9rem", fontWeight: 400 }}>
              Disciplinas
            </span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
            Calibre o peso no edital e a dificuldade individual para balancear a carga horária do ciclo.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          {hasDemoSubjects ? (
            <button className="chip-pill" onClick={handleRemoveDemo}>
              <Sparkles size={14} style={{ color: "#f7a072" }} />
              <span>Remover Demonstração</span>
            </button>
          ) : (
            <button className="chip-pill" onClick={handleLoadDemo}>
              <Sparkles size={14} style={{ color: "#f7a072" }} />
              <span>Carregar Exemplo</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            <span>Nova Disciplina</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {data.subjects.length === 0 ? (
        <div
          className="editorial-card"
          style={{ textAlign: "center", padding: "3.75rem 2rem", maxWidth: 580, margin: "2rem auto" }}
        >
          <div className="section-kicker" style={{ color: "#73ba9b" }}>
            Biblioteca Vazia
          </div>
          <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Nenhuma disciplina <span className="serif-accent">cadastrada</span>
          </h3>
          <p style={{ color: "var(--text-secondary)", maxWidth: 440, margin: "0 auto 1.75rem", fontSize: "0.92rem", lineHeight: 1.6 }}>
            Adicione as matérias do seu plano de estudos para que o algoritmo estruture os blocos do ciclo.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} />
              <span>Cadastrar Primeira Matéria</span>
            </button>
            <button className="btn btn-secondary" onClick={handleLoadDemo}>
              <Sparkles size={16} style={{ color: "#f7a072" }} />
              <span>Carregar Exemplo</span>
            </button>
          </div>
        </div>
      ) : (
        /* Clean Editorial Subject Grid */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.15rem" }}>
          {filteredSubjects.map((s, idx) => {
            const stats = subjectStatsData.find((st) => st.subjectId === s.id);
            const totalMins = stats ? stats.minutes : 0;
            const alloc = data.cycle.plan?.allocations.find((a) => a.subjectId === s.id);
            const visual = getSubjectVisual(s.name, idx);
            const sharePct = alloc ? Math.round(alloc.share * 100) : 0;

            return (
              <div
                key={s.id}
                className="editorial-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1.15rem",
                }}
              >
                <div>
                  {/* Top row: Rounded-Square Icon Tile + Name & Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.95rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
                      <SubjectIcon visual={visual} size="md" />
                      <div style={{ minWidth: 0 }}>
                        <h3
                          style={{
                            fontSize: "1.05rem",
                            fontWeight: 700,
                            letterSpacing: "-0.015em",
                            color: "var(--text-primary)",
                            lineHeight: 1.25,
                          }}
                        >
                          {s.name}
                        </h3>
                        <span className="tabular-nums" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {alloc ? `${alloc.blocks} blocos • ${sharePct}% do ciclo` : "Aguardando cálculo"}
                          {s.isDemo ? " • Demo" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Minimal reorder & edit actions */}
                    <div style={{ display: "flex", gap: "0.1rem", flexShrink: 0 }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleMoveSubject(s.id, -1)}
                        disabled={idx === 0}
                        title="Mover para cima"
                        style={{ opacity: idx === 0 ? 0.25 : 0.75 }}
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleMoveSubject(s.id, 1)}
                        disabled={idx === data.subjects.length - 1}
                        title="Mover para baixo"
                        style={{ opacity: idx === data.subjects.length - 1 ? 0.25 : 0.75 }}
                      >
                        <ChevronDown size={15} />
                      </button>
                      <button className="btn-icon" onClick={() => openEditModal(s)} title="Editar disciplina">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-icon" onClick={() => setConfirmDeleteId(s.id)} title="Excluir disciplina">
                        <Trash2 size={14} style={{ color: "var(--accent-hard)" }} />
                      </button>
                    </div>
                  </div>

                  {/* Discrete Dual-Tone Progress Bar for Subject Share */}
                  <div style={{ marginBottom: "0.85rem" }}>
                    <div className="dual-progress-track" style={{ height: 8 }}>
                      <div
                        className="dual-progress-fill-sage"
                        style={{ width: `${Math.max(12, Math.min(85, sharePct * 2.2))}%` }}
                      />
                      <div className="dual-progress-fill-apricot" style={{ width: "12%" }} />
                    </div>
                  </div>

                  {/* Metadata Pills */}
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span className="chip-pill" style={{ padding: "0.2rem 0.6rem", fontSize: "0.72rem" }}>
                      Peso {s.weight} ({WEIGHT_LABELS[s.weight]})
                    </span>

                    <span className={`badge badge-${s.difficulty}`}>
                      {DIFFICULTY_LABELS[s.difficulty]}
                    </span>

                    <span
                      className="tabular-nums"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.72rem",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "var(--radius-full)",
                        backgroundColor: "var(--bg-surface-subtle)",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      <Clock size={11} />
                      {s.sessionMinutes ? `${s.sessionMinutes}m` : `${data.settings.sessionMinutes}m`}
                    </span>
                  </div>
                </div>

                {/* Bottom stats row + Study Action */}
                <div
                  className="tabular-nums"
                  style={{
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "0.85rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                    <span>
                      Ciclo: <strong>{alloc ? formatTiimoDuration(alloc.minutes) : "0m"}</strong>
                    </span>
                    <span>
                      Acumulado: <strong>{formatMinutes(totalMins)}</strong>
                    </span>
                  </div>

                  <button
                    className="btn-circle-action"
                    style={{ width: 34, height: 34 }}
                    title={`Iniciar estudo de ${s.name}`}
                    onClick={() => {
                      const blk = data.cycle.plan?.blocks.find((b) => b.subjectId === s.id);
                      if (blk) {
                        handleJumpTo(blk.index);
                        setActiveTab("study");
                      } else {
                        setActiveTab("cycle");
                      }
                    }}
                  >
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                  {editingSubject ? (
                    <>
                      Editar <span className="serif-accent">Disciplina</span>
                    </>
                  ) : (
                    <>
                      Nova <span className="serif-accent">Disciplina</span>
                    </>
                  )}
                </h3>
                <button type="button" className="btn-icon" onClick={() => setModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                {/* Name */}
                <div className="form-group">
                  <label className="form-label">Nome da Disciplina *</label>
                  <input
                    type="text"
                    className={`input ${errors.name ? "input-error" : ""}`}
                    placeholder="Ex: Direito Constitucional, Raciocínio Lógico..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>

                {/* Weight */}
                <div className="form-group" style={{ marginTop: "1.1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <label className="form-label">Peso / Relevância no Edital</label>
                    <span className="tabular-nums" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {weight} — {WEIGHT_LABELS[weight]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--brand-identity)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    <span>1 (Baixa)</span>
                    <span>3 (Média)</span>
                    <span>5 (Muito alta)</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="form-group" style={{ marginTop: "1.1rem" }}>
                  <label className="form-label">Percepção de Dificuldade</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.55rem" }}>
                    {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`badge badge-${d}`}
                        style={{
                          padding: "0.68rem",
                          borderRadius: "var(--radius-sm)",
                          justifyContent: "center",
                          borderWidth: difficulty === d ? 1.5 : 1,
                          borderColor: difficulty === d ? "currentColor" : "transparent",
                          opacity: difficulty === d ? 1 : 0.65,
                          cursor: "pointer",
                        }}
                      >
                        {difficulty === d && <Check size={13} />}
                        <span>{DIFFICULTY_LABELS[d]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Session Length */}
                <div className="form-group" style={{ marginTop: "1.1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.84rem", cursor: "pointer", fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={sessionCustom}
                      onChange={(e) => setSessionCustom(e.target.checked)}
                      style={{ accentColor: "var(--brand-identity)", width: 15, height: 15 }}
                    />
                    <span>Personalizar duração do bloco para esta matéria</span>
                  </label>

                  {sessionCustom && (
                    <div style={{ marginTop: "0.55rem", display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <Clock size={16} style={{ color: "var(--text-muted)" }} />
                      <input
                        type="number"
                        min="15"
                        max="180"
                        step="5"
                        value={sessionMinutes}
                        onChange={(e) => setSessionMinutes(Number(e.target.value))}
                        className={`input ${errors.sessionMinutes ? "input-error" : ""}`}
                        style={{ width: 110 }}
                      />
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>minutos por sessão</span>
                    </div>
                  )}
                  {errors.sessionMinutes && <span className="form-error">{errors.sessionMinutes}</span>}
                </div>

                {/* Color Picker */}
                <div className="form-group" style={{ marginTop: "1.1rem" }}>
                  <label className="form-label">Tom Cromático no Ciclo</label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    {SUBJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          backgroundColor: c,
                          border: color === c ? "2.5px solid var(--text-primary)" : "2px solid transparent",
                          cursor: "pointer",
                          transition: "transform var(--transition-fast)",
                          transform: color === c ? "scale(1.12)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingSubject ? "Salvar Alterações" : "Cadastrar Disciplina"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: "center", padding: "2rem" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-hard-bg)",
                  color: "var(--accent-hard)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <AlertTriangle size={24} />
              </div>

              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.45rem" }}>
                Excluir Disciplina?
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
                O ciclo será recalculado automaticamente. Os registros anteriores permanecerão preservados no histórico.
              </p>

              <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center" }}>
                <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    handleDeleteSubject(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
