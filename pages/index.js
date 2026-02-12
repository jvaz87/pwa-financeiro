import { useEffect, useMemo, useState } from "react";
import styles from "../styles/app.module.css";

export default function Home() {
  const [screen, setScreen] = useState("home");
  const [months, setMonths] = useState([]); // ["YYYY-MM", ...]
  const [month, setMonth] = useState("");
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({
    gasto: 0,
    recebimento: 0,
    saldo: 0,
    fixo: 0,
    variavel: 0,
  });

  // Dashboard anual
  const [yearTotals, setYearTotals] = useState({
    gasto: 0,
    recebimento: 0,
    saldo: 0,
    fixo: 0,
    variavel: 0,
  });
  const [yearSeries, setYearSeries] = useState([]); // [{month, gasto, recebimento}, ...]

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // busca no histórico
  const [q, setQ] = useState("");

  // edição
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
      setYearSeries(y.byMonth || []);
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

  // obrigatório: desc, value, type, nature
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

  // histórico filtrado por descrição
  const itemsFiltrados = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    if (!term) return items;
    return (items || []).filter((it) =>
      String(it.desc || "").toLowerCase().includes(term)
    );
  }, [items, q]);

  const selectedYear = useMemo(() => String(month || "").split("-")[0] || "", [month]);

  return (
    <div className={styles.app}>
      {/* TOPO */}
      <header className={styles.topbar}>
        <h1>Controle Financeiro • JVAZ87</h1>

        {/* ✅ ÚNICO seletor de mês (vale pro app todo) */}
        <select value={month} onChange={(e) => setMonth(e.target.value)} disabled={loading}>
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
          <button onClick={() => setScreen("dash")} disabled={loading}>📊 Dashboard</button>
          <button onClick={() => setScreen("add")} disabled={loading}>➕ Lançar</button>
          <button onClick={() => setScreen("hist")} disabled={loading}>🧾 Histórico</button>
        </section>
      )}

      {/* DASHBOARD */}
      {screen === "dash" && (
        <section className={styles.dash}>
          {/* ✅ REMOVIDO: seletores repetidos aqui */}

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Recebimentos</div>
              <div className={`${styles.kpiValue} $
