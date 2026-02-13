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
    fixo: 0,
    variavel: 0,
  });

  const [yearTotals, setYearTotals] = useState({
    gasto: 0,
    recebimento: 0,
    saldo: 0,
    fixo: 0,
    variavel: 0,
  });

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // busca no histórico
  const [q, setQ] = useState("");

  // edição
  const [editingId, setEditingId] = useState(null);

  // tema
  const [theme, setTheme] = useState("dark"); // "dark" | "light"

  const [form, setForm] = useState({
    date: todayISO(),
    value: "",
    desc: "",
    type: "",
    nature: "",
    pay: "",
  });

  useEffect(() => {
    // Tema: carrega preferencia (ou sistema) e já seta theme-color
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") {
        applyTheme(saved);
        setTheme(saved);
      } else {
        const prefersDark =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;

        const initial = prefersDark ? "dark" : "light";
        applyTheme(initial);
        setTheme(initial);
      }
    } catch {
      applyTheme("dark");
      setTheme("dark");
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function api(action, data) {
    const r = await fetch("/api/gs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Erro");
    return j;
  }

  async function init() {
    try {
      setLoading(true);
      const j = await api("init", {});
      setMonths(j.months || []);
      setMonth(j.currentMonth || "");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (month) refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function refreshAll() {
    try {
      setLoading(true);
      setMsg("");

      const year = String(month).split("-")[0];

      const [d, l, y] = await Promise.all([
        api("dashboard", { month }),
        api("list", { month }),
        api("dashboard_year", { year }),
      ]);

      setTotals(d.totals || totals);
      setItems(l.items || []);
      setYearTotals(y.totals || yearTotals);
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function setThemeColor(color) {
    if (typeof document === "undefined") return;

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  }

  function applyTheme(next) {
    if (typeof document === "undefined") return;

    document.documentElement.setAttribute("data-theme", next);
    document.body.setAttribute("data-theme", next);

    // barra do celular
    const themeColor = next === "light" ? "#eef2ff" : "#081022";
    setThemeColor(themeColor);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
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

  // YYYY-MM -> Fev/2026
  const formatMesAno = (ym) => {
    if (!ym) return "";
    const [year, mm] = String(ym).split("-");
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const nome = meses[(Number(mm) || 1) - 1] || mm;
    return `${nome}/${year}`;
  };

  const monthsOptions = useMemo(
    () => (months || []).map((m) => ({ value: m, label: formatMesAno(m) })),
    [months]
  );

  function validateForm() {
    return !!(form.desc && form.value && form.type && form.nature);
  }

  function limparCampos() {
    setForm((prev) => ({
      ...prev,
      date: todayISO(),
      value: "",
      desc: "",
      type: "",
      nature: "",
    }));
  }

  async function save() {
    try {
      setMsg("");

      if (!validateForm()) {
        return setMsg("❌ Preencha: descrição, valor, tipo e natureza.");
      }

      setLoading(true);

      if (editingId) {
        await api("update", {
          id: editingId,
          date: form.date,
          desc: form.desc,
          type: form.type,
          nature: form.nature,
          pay: form.pay,
          value: form.value,
        });
        setEditingId(null);
        setMsg("✅ Lançamento atualizado!");
      } else {
        await api("add", { ...form });
        setMsg("✅ Salvo!");
      }

      limparCampos();
      await refreshAll();
      setScreen("hist");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function del(it) {
    if (!confirm("Excluir lançamento?")) return;
    try {
      setLoading(true);
      await api("delete", { id: it.id });
      await refreshAll();
      setMsg("✅ Excluído!");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function brToISO(dateBR) {
    if (!dateBR || typeof dateBR !== "string") return todayISO();
    const parts = dateBR.split("/");
    if (parts.length !== 3) return todayISO();
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  function startEdit(it) {
    setEditingId(it.id);
    setForm({
      date: it.date ? String(it.date).slice(0, 10) : brToISO(it.dateBR),
      value: it.value ?? "",
      desc: it.desc ?? "",
      type: it.type ?? "",
      nature: it.nature ?? "",
      pay: it.pay ?? "",
    });
    setMsg("✏️ Editando lançamento...");
    setScreen("add");
  }

  function cancelEdit() {
    setEditingId(null);
    limparCampos();
    setMsg("");
  }

  function valueClassByType(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("receb")) return styles.valorRecebimento;
    if (t.includes("gasto")) return styles.valorGasto;
    return "";
  }

  function itemTypeClass(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("receb")) return styles.itemIncome;
    if (t.includes("gasto")) return styles.itemExpense;
    return "";
  }

  function badgeClass(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("receb")) return styles.badgeIncome;
    if (t.includes("gasto")) return styles.badgeExpense;
    return "";
  }

  const itemsFiltrados = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    if (!term) return items;
    return (items || []).filter((it) =>
      String(it.desc || "").toLowerCase().includes(term)
    );
  }, [items, q]);

  const selectedYear = useMemo(
    () => String(month || "").split("-")[0] || "",
    [month]
  );

  return (
    <div className={styles.app}>
      {/* TOPO */}
      <header className={styles.topbar}>
        <h1 className={styles.appTitle}>
          <span className={styles.titleMain}>Controle</span>
          <span className={styles.titleAccent}>Financeiro</span>
        </h1>

        <div className={styles.topRight}>
          <button
            type="button"
            className={`${styles.themeBtn} ${styles.glassBtn}`}
            onClick={toggleTheme}
            aria-label="Alternar tema"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            disabled={loading}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={loading}
          >
            {monthsOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* HOME */}
      {screen === "home" && (
        <section className={styles.card}>
          <button onClick={() => setScreen("dash")} disabled={loading}>
            📊 Dashboard
          </button>
          <button onClick={() => setScreen("add")} disabled={loading}>
            ➕ Lançar
          </button>
          <button onClick={() => setScreen("hist")} disabled={loading}>
            🧾 Histórico
          </button>
        </section>
      )}

      {/* DASHBOARD */}
      {screen === "dash" && (
        <section key={month} className={`${styles.dash} ${styles.fadeUp}`}>
          <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${styles.glass}`}>
              <div className={styles.kpiLabel}>Recebimentos</div>
              <div className={`${styles.kpiValue} ${styles.valorRecebimento}`}>
                {brl(totals.recebimento)}
              </div>
              <div className={styles.kpiHint}>Total no mês</div>
            </div>

            <div className={`${styles.kpiCard} ${styles.glass}`}>
              <div className={styles.kpiLabel}>Gastos</div>
              <div className={`${styles.kpiValue} ${styles.valorGasto}`}>
                {brl(totals.gasto)}
              </div>
              <div className={styles.kpiHint}>Total no mês</div>
            </div>

            <div className={`${styles.kpiCardWide} ${styles.glass}`}>
              <div className={styles.kpiLabel}>Saldo</div>

              <div
                className={`${styles.kpiValueStrong} ${
                  Number(totals.saldo || 0) >= 0 ? styles.saldoPos : styles.saldoNeg
                }`}
              >
                {brl(totals.saldo)}
              </div>

              {(() => {
                const rec = Number(totals.recebimento || 0);
                const gas = Number(totals.gasto || 0);
                const perc =
                  rec > 0 ? Math.min(100, (gas / rec) * 100) : gas > 0 ? 100 : 0;

                return (
                  <>
                    <div className={styles.barRow}>
                      <span className={styles.barLabel}>Gasto / Receb.</span>
                      <span className={styles.barValue}>
                        {rec > 0 ? `${Math.round(perc)}%` : gas > 0 ? "100%" : "—"}
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

                    <div className={styles.splitGrid}>
                      <div className={styles.splitCard}>
                        <div className={styles.splitTitle}>Fixo</div>
                        <div className={styles.splitValue}>{brl(totals.fixo)}</div>
                      </div>

                      <div className={styles.splitCard}>
                        <div className={styles.splitTitle}>Variável</div>
                        <div className={styles.splitValue}>{brl(totals.variavel)}</div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* ANUAL INLINE */}
            <div className={`${styles.kpiCardWide} ${styles.glass}`}>
              <div className={styles.kpiLabel}>Resumo do ano • {selectedYear}</div>

              <div className={styles.yearInlineGrid}>
                <div className={`${styles.yearInlineCard} ${styles.glass}`}>
                  <div className={styles.yearInlineTitle}>Recebimentos</div>
                  <div className={`${styles.yearInlineValue} ${styles.valorRecebimento}`}>
                    {brl(yearTotals.recebimento)}
                  </div>
                </div>

                <div className={`${styles.yearInlineCard} ${styles.glass}`}>
                  <div className={styles.yearInlineTitle}>Gastos</div>
                  <div className={`${styles.yearInlineValue} ${styles.valorGasto}`}>
                    {brl(yearTotals.gasto)}
                  </div>
                </div>

                <div className={`${styles.yearInlineCard} ${styles.glass}`}>
                  <div className={styles.yearInlineTitle}>Saldo</div>
                  <div
                    className={`${styles.yearInlineValue} ${
                      Number(yearTotals.saldo || 0) >= 0 ? styles.saldoPos : styles.saldoNeg
                    }`}
                  >
                    {brl(yearTotals.saldo)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.dashActions}>
            <button onClick={refreshAll} disabled={loading}>
              {loading ? "Carregando..." : "Atualizar"}
            </button>
            <button onClick={() => setScreen("home")} disabled={loading}>
              Voltar
            </button>
          </div>
        </section>
      )}

      {/* LANÇAR */}
      {screen === "add" && (
        <section className={`${styles.card} ${styles.fadeUp}`}>
          <div className={styles.formHeaderRow}>
            <div className={styles.formTitle}>
              {editingId ? "✏️ Editar lançamento" : "➕ Novo lançamento"}
            </div>

            {editingId && (
              <button
                className={styles.ghostBtn}
                onClick={cancelEdit}
                disabled={loading}
                type="button"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            disabled={loading}
          />

          <input
            placeholder="Descrição *"
            value={form.desc}
            required
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            disabled={loading}
          />

          <input
            placeholder="Valor (ex: 12,50) *"
            value={form.value}
            required
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            disabled={loading}
          />

          <select
            value={form.type}
            required
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            disabled={loading}
          >
            <option value="">Tipo *</option>
            <option>Gasto</option>
            <option>Recebimento</option>
          </select>

          <select
            value={form.nature}
            required
            onChange={(e) => setForm({ ...form, nature: e.target.value })}
            disabled={loading}
          >
            <option value="">Natureza *</option>
            <option>Fixo</option>
            <option>Variável</option>
          </select>

          <select
            value={form.pay}
            onChange={(e) => setForm({ ...form, pay: e.target.value })}
            disabled={loading}
          >
            <option value="">Pagamento</option>
            <option>Débito</option>
            <option>Crédito</option>
          </select>

          <div className={styles.row2}>
            <button onClick={save} className={styles.primaryBtn} disabled={loading}>
              {editingId ? "Salvar alterações" : "Salvar"}
            </button>
            <button onClick={() => setScreen("home")} disabled={loading}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      {/* HISTÓRICO */}
      {screen === "hist" && (
        <section className={`${styles.card} ${styles.fadeUp}`}>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              placeholder="Buscar por descrição..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={loading}
            />
            <button
              className={styles.clearBtn}
              onClick={() => setQ("")}
              disabled={loading || !q}
              type="button"
            >
              Limpar
            </button>
          </div>

          {itemsFiltrados.length === 0 ? (
            <div className={styles.empty}>
              {q ? "Nenhum lançamento encontrado." : "Sem lançamentos neste mês."}
            </div>
          ) : (
            itemsFiltrados.map((it) => (
              <div key={it.id} className={`${styles.item} ${styles.glass} ${itemTypeClass(it.type)}`}>
                <div className={styles.itemHead}>
                  <div className={styles.itemTitleRow}>
                    <strong className={styles.itemTitle}>{it.desc}</strong>
                    <span className={`${styles.badge} ${badgeClass(it.type)}`}>{it.type}</span>
                  </div>

                  <div className={styles.itemSubRow}>
                    <span className={styles.itemDate}>{it.dateBR}</span>
                    <span className={`${styles.itemValue} ${valueClassByType(it.type)}`}>
                      {brl(it.value)}
                    </span>
                  </div>
                </div>

                <div className={styles.itemActions}>
                  <button
                    onClick={() => startEdit(it)}
                    className={styles.editBtn}
                    disabled={loading}
                    type="button"
                  >
                    ✏️ <span>Editar</span>
                  </button>

                  <button
                    onClick={() => del(it)}
                    className={styles.deleteBtn}
                    disabled={loading}
                    type="button"
                  >
                    🗑️ <span>Excluir</span>
                  </button>
                </div>
              </div>
            ))
          )}

          <button onClick={() => setScreen("home")} disabled={loading} type="button">
            Voltar
          </button>
        </section>
      )}

      {msg && <div className={styles.msg}>{msg}</div>}
    </div>
  );
}
