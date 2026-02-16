import { useEffect, useMemo, useState } from "react";
import styles from "../styles/app.module.css";

export default function Home() {
  const [screen, setScreen] = useState("home");

  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");

  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({
    gasto: 0,
    recebimento: 0,
    saldo: 0,
    fixoGasto: 0,
    variavelGasto: 0,
    fixoReceb: 0,
    variavelReceb: 0,
  });

  const [msg, setMsg] = useState("");

  // Tema (usa o data-theme no html)
  const [theme, setTheme] = useState("dark");

  // Buscar no histórico
  const [q, setQ] = useState("");

  // Form lançar
  const [form, setForm] = useState({
    date: todayISO(),
    value: "",
    desc: "",
    type: "",
    nature: "",
    pay: "",
  });

  // Editar item (histórico)
  const [editing, setEditing] = useState(null); // item inteiro
  const [editForm, setEditForm] = useState({
    date: "",
    value: "",
    desc: "",
    type: "",
    nature: "",
    pay: "",
  });

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // tema inicial
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const initial = saved === "light" ? "light" : "dark";
    setTheme(initial);
    applyTheme(initial);

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyTheme(t) {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", t);
    document.body.setAttribute("data-theme", t);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  async function api(action, data) {
    const r = await fetch("/api/gs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) throw new Error(j.error || "Erro");
    return j;
  }

  async function init() {
    try {
      setMsg("");
      const j = await api("init", {});
      setMonths(j.months || []);
      setMonth(j.currentMonth || "");
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  useEffect(() => {
    if (month) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function refresh() {
    try {
      setMsg("");
      const [d, l, y] = await Promise.all([
        api("dashboard", { month }),
        api("list", { month }),
        api("dashboard_year", { year: String(month).slice(0, 4) }),
      ]);

      setTotals((prev) => ({
        ...prev,
        ...(d.totals || {}),
        yearTotals: y.totals || { gasto: 0, recebimento: 0, saldo: 0 },
      }));

      setItems(l.items || []);
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  // ---------- Lançar ----------
  async function save() {
    try {
      setMsg("");

      // obrigatórios (mantive pagamento obrigatório pra não quebrar o backend)
      if (!form.desc || !form.value || !form.type || !form.nature || !form.pay) {
        return setMsg("❌ Preencha descrição, valor, tipo, natureza e pagamento.");
      }

      await api("add", { ...form });
      setForm((prev) => ({ ...prev, value: "", desc: "" }));
      setMsg("✅ Salvo!");
      await refresh();
      setScreen("hist");
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  // ---------- Excluir ----------
  async function del(it) {
    if (!confirm("Excluir lançamento?")) return;
    try {
      setMsg("");
      await api("delete", { id: it.id });
      await refresh();
      setMsg("✅ Excluído!");
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  // ---------- Editar ----------
  function startEdit(it) {
    setEditing(it);
    setEditForm({
      date: it.date || todayISO(),
      desc: it.desc || "",
      value: it.value != null ? Number(it.value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
      type: it.type || "",
      nature: it.nature || "",
      pay: it.pay || "",
    });
    setMsg("");
  }

  function cancelEdit() {
    setEditing(null);
    setEditForm({
      date: "",
      value: "",
      desc: "",
      type: "",
      nature: "",
      pay: "",
    });
    setMsg("");
  }

  async function submitEdit() {
    if (!editing) return;
    try {
      setMsg("");

      if (!editForm.desc || !editForm.value || !editForm.type || !editForm.nature || !editForm.pay) {
        return setMsg("❌ Preencha descrição, valor, tipo, natureza e pagamento.");
      }

      await api("update", { id: editing.id, ...editForm });
      setMsg("✅ Atualizado!");
      setEditing(null);
      await refresh();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  // ---------- Utils ----------
function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

// "1234" => "12,34"
function digitsToBRLString(digits) {
  const d = onlyDigits(digits);
  const cents = Number(d || "0");
  const v = cents / 100;

  // Formata sem "R$" (só número com vírgula)
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// garante formato do payload: "12,34"
function normalizeValueToBRString(valueText) {
  // se já vier no formato "12,34" ou "12.34", tenta normalizar
  const s = String(valueText || "").trim();
  if (!s) return "";

  // se tiver vírgula/ponto, tenta extrair número
  // mas preferimos o modo "digitsToBRLString" quando usuário digita
  const digits = onlyDigits(s);
  if (!digits) return "";

  return digitsToBRLString(digits);
}
  
  function brl(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function fmtMonth(ym) {
    // ym = "2026-02"
    if (!/^\d{4}-\d{2}$/.test(String(ym || ""))) return String(ym || "");
    const [y, m] = ym.split("-");
    const names = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];
    return `${names[Number(m) - 1]}/${y}`;
  }

  const filteredItems = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) =>
      String(it.desc || "").toLowerCase().includes(term)
    );
  }, [items, q]);

  // Barra gasto/receb
  const gasto = Number(totals.gasto || 0);
  const receb = Number(totals.recebimento || 0);
  const perc = receb > 0 ? Math.min(100, (gasto / receb) * 100) : gasto > 0 ? 100 : 0;

  const saldoNum = Number(totals.saldo || 0);

  return (
    <div className={styles.app}>
      {/* TOPO */}
      <header className={styles.topbar}>
        <h1>Controle Financeiro</h1>

        <div className={styles.topActions}>
          <button
            className={styles.themeBtn}
            onClick={toggleTheme}
            aria-label="Alternar tema"
            title="Alternar tema"
            type="button"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <select
            className={styles.monthSelect}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {fmtMonth(m)}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* HOME */}
      {screen === "home" && (
        <section className={styles.card}>
          <button onClick={() => setScreen("dash")}>📊 Dashboard</button>
          <button onClick={() => setScreen("add")}>➕ Lançar</button>
          <button onClick={() => setScreen("hist")}>🧾 Histórico</button>
        </section>
      )}

      {/* DASHBOARD */}
      {screen === "dash" && (
        <section className={styles.dash}>
          <div className={styles.kpiGrid}>
            {/* RECEBIMENTOS */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Recebimentos</div>
              <div className={`${styles.kpiValue} ${styles.valueGreen}`}>
                {brl(totals.recebimento)}
              </div>
              <div className={styles.kpiHint}>Total no mês</div>

              <div className={styles.subRow}>
                <div className={styles.subChip}>
                  <span>Fixo</span>
                  <b>{brl(totals.fixoReceb ?? 0)}</b>
                </div>
                <div className={styles.subChip}>
                  <span>Variável</span>
                  <b>{brl(totals.variavelReceb ?? 0)}</b>
                </div>
              </div>
            </div>

            {/* GASTOS */}
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Gastos</div>
              <div className={`${styles.kpiValue} ${styles.valueRed}`}>
                {brl(totals.gasto)}
              </div>
              <div className={styles.kpiHint}>Total no mês</div>

              <div className={styles.subRow}>
                <div className={styles.subChip}>
                  <span>Fixo</span>
                  <b>{brl(totals.fixoGasto ?? 0)}</b>
                </div>
                <div className={styles.subChip}>
                  <span>Variável</span>
                  <b>{brl(totals.variavelGasto ?? 0)}</b>
                </div>
              </div>
            </div>

            {/* SALDO */}
            <div className={styles.kpiCardWide}>
              <div className={styles.kpiLabel}>Saldo</div>

              <div
                className={`${styles.kpiValueStrong} ${
                  saldoNum >= 0 ? styles.saldoPos : styles.saldoNeg
                }`}
              >
                {brl(totals.saldo)}
              </div>

              <div className={styles.barRow}>
                <span className={styles.barLabel}>Gasto / Receb.</span>
                <span className={styles.barValue}>
                  {receb > 0 ? `${Math.round(perc)}%` : gasto > 0 ? "100%" : "—"}
                </span>
              </div>

              <div className={styles.progress}>
                <div
                  className={`${styles.progressFill} ${
                    perc >= 80
                      ? styles.barRed
                      : perc >= 50
                      ? styles.barYellow
                      : styles.barGreen
                  }`}
                  style={{ width: `${Math.min(100, Math.round(perc))}%` }}
                />
              </div>
            </div>
          </div>

          {/* RESUMO ANUAL */}
          <div className={styles.yearCard}>
            <div className={styles.yearTitle}>
              Resumo do ano • {String(month).slice(0, 4)}
            </div>

            <div className={styles.yearGrid}>
              <div className={styles.yearMini}>
                <div className={styles.yearMiniLabel}>Recebimentos</div>
                <div className={`${styles.yearMiniValue} ${styles.valueGreen}`}>
                  {brl(totals.yearTotals?.recebimento)}
                </div>
              </div>
              <div className={styles.yearMini}>
                <div className={styles.yearMiniLabel}>Gastos</div>
                <div className={`${styles.yearMiniValue} ${styles.valueRed}`}>
                  {brl(totals.yearTotals?.gasto)}
                </div>
              </div>
              <div className={styles.yearMini}>
                <div className={styles.yearMiniLabel}>Saldo</div>
                <div
                  className={`${styles.yearMiniValue} ${
                    Number(totals.yearTotals?.saldo || 0) >= 0
                      ? styles.saldoPos
                      : styles.saldoNeg
                  }`}
                >
                  {brl(totals.yearTotals?.saldo)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.dashActions}>
            <button onClick={refresh}>Atualizar</button>
            <button onClick={() => setScreen("home")}>Voltar</button>
          </div>
        </section>
      )}

      {/* ADD */}
      {screen === "add" && (
        <section className={styles.card}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          <input
            placeholder="Descrição"
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />

          <input
          inputMode="numeric"
          placeholder="Valor"
          value={form.value}
          onChange={(e) => {
          const masked = digitsToBRLString(e.target.value);
          setForm({ ...form, value: masked });
  }}
  onBlur={() => {
    // garante que ao sair do campo fique certinho
    setForm((p) => ({ ...p, value: normalizeValueToBRString(p.value) }));
  }}
/>

          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="">Tipo</option>
            <option>Gasto</option>
            <option>Recebimento</option>
          </select>

          <select
            value={form.nature}
            onChange={(e) => setForm({ ...form, nature: e.target.value })}
          >
            <option value="">Natureza</option>
            <option>Fixo</option>
            <option>Variável</option>
          </select>

          <select
            value={form.pay}
            onChange={(e) => setForm({ ...form, pay: e.target.value })}
          >
            <option value="">Pagamento</option>
            <option>Débito</option>
            <option>Crédito</option>
          </select>

          <div className={styles.row2}>
            <button onClick={save} className={styles.primaryBtn}>
              Salvar
            </button>
            <button onClick={() => setScreen("home")}>Cancelar</button>
          </div>
        </section>
      )}

      {/* HIST */}
      {screen === "hist" && (
        <section className={styles.card}>
          {/* Barra de busca */}
          <div className={styles.searchRow}>
            <input
              placeholder="Buscar por descrição..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className={styles.clearBtn} onClick={() => setQ("")}>
              Limpar
            </button>
          </div>

          {/* Lista */}
          {filteredItems.length === 0 ? (
            <div className={styles.empty}>Sem lançamentos neste mês.</div>
          ) : (
            filteredItems.map((it) => {
              const isEditing = editing?.id === it.id;
              return (
                <div key={it.id} className={styles.item}>
                  {!isEditing ? (
                    <>
                      <div className={styles.itemTop}>
                        <strong>{it.desc}</strong>
                        <span
                          className={`${styles.badge} ${
                            String(it.type || "").toLowerCase() === "gasto"
                              ? styles.badgeGasto
                              : styles.badgeReceb
                          }`}
                        >
                          {it.type}
                        </span>
                      </div>

                      <div className={styles.itemMeta}>
                        <span>{it.dateBR}</span>
                        <span
                          className={
                            String(it.type || "").toLowerCase() === "gasto"
                              ? styles.valueRed
                              : styles.valueGreen
                          }
                        >
                          {brl(it.value)}
                        </span>
                      </div>

                      <div className={styles.itemActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => startEdit(it)}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => del(it)}
                          className={styles.dangerBtn}
                        >
                          Excluir
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.editHeader}>
                        <strong>Editando</strong>
                        <span className={styles.badgeMuted}>#{String(it.id).slice(0, 6)}</span>
                      </div>

                      <div className={styles.editGrid}>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) =>
                            setEditForm({ ...editForm, date: e.target.value })
                          }
                        />
                        <input
                          placeholder="Descrição"
                          value={editForm.desc}
                          onChange={(e) =>
                            setEditForm({ ...editForm, desc: e.target.value })
                          }
                        />
                        <input
                          inputMode="numeric"
                          placeholder="Valor"
                          value={editForm.value}
                          onChange={(e) => {
                            const masked = digitsToBRLString(e.target.value);
                            setEditForm({ ...editForm, value: masked });
                         }}
                          onBlur={() => {
                            setEditForm((p) => ({ ...p, value: normalizeValueToBRString(p.value) }));
                         }}
                        />

                        <select
                          value={editForm.type}
                          onChange={(e) =>
                            setEditForm({ ...editForm, type: e.target.value })
                          }
                        >
                          <option value="">Tipo</option>
                          <option>Gasto</option>
                          <option>Recebimento</option>
                        </select>

                        <select
                          value={editForm.nature}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              nature: e.target.value,
                            })
                          }
                        >
                          <option value="">Natureza</option>
                          <option>Fixo</option>
                          <option>Variável</option>
                        </select>

                        <select
                          value={editForm.pay}
                          onChange={(e) =>
                            setEditForm({ ...editForm, pay: e.target.value })
                          }
                        >
                          <option value="">Pagamento</option>
                          <option>Débito</option>
                          <option>Crédito</option>
                        </select>
                      </div>

                      <div className={styles.row2}>
                        <button className={styles.primaryBtn} onClick={submitEdit}>
                          Salvar
                        </button>
                        <button onClick={cancelEdit}>Cancelar</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}

          <button onClick={() => setScreen("home")}>Voltar</button>
        </section>
      )}

      {msg && <div className={styles.msg}>{msg}</div>}
    </div>
  );
}

