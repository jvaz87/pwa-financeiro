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
  });

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    date: todayISO(),
    value: "",
    desc: "",
    type: "",
    nature: "",
    pay: "",
  });

  useEffect(() => {
    init();
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
  }, [month]);

  async function refreshAll() {
    try {
      setLoading(true);
      const year = String(month).split("-")[0];

      const [d, l, y] = await Promise.all([
        api("dashboard", { month }),
        api("list", { month }),
        api("dashboard_year", { year }),
      ]);

      setTotals(d.totals || {});
      setItems(l.items || []);
      setYearTotals(y.totals || {});
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function brl(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  const formatMesAno = (ym) => {
    if (!ym) return "";
    const [year, mm] = ym.split("-");
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${meses[(Number(mm) || 1) - 1]}/${year}`;
  };

  const monthsOptions = useMemo(
    () => months.map((m) => ({ value: m, label: formatMesAno(m) })),
    [months]
  );

  function validateForm() {
    return !!(form.desc && form.value && form.type && form.nature);
  }

  function limparCampos() {
    setForm({
      date: todayISO(),
      value: "",
      desc: "",
      type: "",
      nature: "",
      pay: "",
    });
  }

  async function save() {
    if (!validateForm()) {
      return setMsg("❌ Preencha todos os campos obrigatórios.");
    }

    try {
      setLoading(true);
      if (editingId) {
        await api("update", { id: editingId, ...form });
        setMsg("✅ Atualizado!");
      } else {
        await api("add", form);
        setMsg("✅ Salvo!");
      }

      setEditingId(null);
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
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(it) {
    setEditingId(it.id);
    setForm({
      date: it.date,
      value: it.value,
      desc: it.desc,
      type: it.type,
      nature: it.nature,
      pay: it.pay,
    });
    setScreen("add");
  }

  const itemsFiltrados = useMemo(() => {
    const term = q.toLowerCase();
    return items.filter((it) =>
      it.desc.toLowerCase().includes(term)
    );
  }, [items, q]);

  const selectedYear = String(month).split("-")[0];

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <h1>Controle Financeiro • JVAZ87</h1>

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
        <section key={month} className={`${styles.dash} ${styles.fadeUp}`}>
          <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${styles.glass}`}>
              <div className={styles.kpiLabel}>Recebimentos</div>
              <div className={`${styles.kpiValue} ${styles.valorRecebimento}`}>
                {brl(totals.recebimento)}
              </div>
            </div>

            <div className={`${styles.kpiCard} ${styles.glass}`}>
              <div className={`${styles.kpiLabel}`}>Gastos</div>
              <div className={`${styles.kpiValue} ${styles.valorGasto}`}>
                {brl(totals.gasto)}
              </div>
            </div>

            <div className={`${styles.kpiCardWide} ${styles.glass}`}
              <div className={styles.kpiLabel}>Saldo</div>
              <div
                className={`${styles.kpiValueStrong} ${
                  totals.saldo >= 0
                    ? styles.saldoPos
                    : styles.saldoNeg
                }`}
              >
                {brl(totals.saldo)}
              </div>
            </div>

            {/* ANUAL SIMPLIFICADO */}
            <div className={`${styles.kpiCardWide} ${styles.glass}`}
              <div className={styles.kpiLabel}>
                Resumo do ano • {selectedYear}
              </div>

              <div className={styles.yearInlineGrid}>
                <div className={`${styles.yearInlineCard} ${styles.glass}`}
                  <div className={styles.yearInlineTitle}>Recebimentos</div>
                  <div className={`${styles.yearInlineValue} ${styles.valorRecebimento}`}>
                    {brl(yearTotals.recebimento)}
                  </div>
                </div>

                <div className={`${styles.yearInlineCard} ${styles.glass}`}
                  <div className={styles.yearInlineTitle}>Gastos</div>
                  <div className={`${styles.yearInlineValue} ${styles.valorGasto}`}>
                    {brl(yearTotals.gasto)}
                  </div>
                </div>

                <div className={styles.yearInlineCard}>
                  <div className={styles.yearInlineTitle}>Saldo</div>
                  <div
                    className={`${styles.yearInlineValue} ${
                      yearTotals.saldo >= 0
                        ? styles.saldoPos
                        : styles.saldoNeg
                    }`}
                  >
                    {brl(yearTotals.saldo)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.dashActions}>
            <button onClick={refreshAll}>Atualizar</button>
            <button onClick={() => setScreen("home")}>Voltar</button>
          </div>
        </section>
      )}

      {/* HIST */}
      {screen === "hist" && (
        <section className={styles.card}>
          <input
            className={styles.searchInput}
            placeholder="Buscar por descrição..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {itemsFiltrados.length === 0 ? (
            <div className={styles.empty}>Sem lançamentos.</div>
          ) : (
            itemsFiltrados.map((it) => (
              <div key={it.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <strong>{it.desc}</strong>
                  <span className={styles.badge}>{it.type}</span>
                </div>

                <div className={styles.itemMeta}>
                  <span>{it.dateBR}</span>
                  <span className={it.type === "Recebimento" ? styles.valorRecebimento : styles.valorGasto}>
                    {brl(it.value)}
                  </span>
                </div>

                <div className={styles.itemActions}>
                  <button onClick={() => startEdit(it)} className={styles.editBtn}>
                    Editar
                  </button>
                  <button onClick={() => del(it)} className={styles.dangerBtn}>
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}

          <button onClick={() => setScreen("home")}>Voltar</button>
        </section>
      )}
    </div>
  );
}

