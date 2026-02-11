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
  const [msg, setMsg] = useState("");

  // edição (histórico)
  const [editing, setEditing] = useState(null); // { id, sheet }

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

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  // Mês atual por nome (bate com MONTH_SHEETS)
  const getMesAtualNome = () => {
    const map = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    return map[new Date().getMonth()];
  };

  // "Janeiro" -> "Jan/2026"
  const formatMonthLabel = (monthName) => {
    const y = new Date().getFullYear();
    const m = String(monthName || "").toLowerCase();

    const short =
      m === "janeiro"
        ? "Jan"
        : m === "fevereiro"
        ? "Fev"
        : m === "março" || m === "marco"
        ? "Mar"
        : m === "abril"
        ? "Abr"
        : m === "maio"
        ? "Mai"
        : m === "junho"
        ? "Jun"
        : m === "julho"
        ? "Jul"
        : m === "agosto"
        ? "Ago"
        : m === "setembro"
        ? "Set"
        : m === "outubro"
        ? "Out"
        : m === "novembro"
        ? "Nov"
        : m === "dezembro"
        ? "Dez"
        : monthName;

    return `${short}/${y}`;
  };

  async function init() {
    try {
      const j = await api("init", {});
      const list = j.months || [];
      setMonths(list);

      // ✅ mês atual selecionado automaticamente
      const mesAtual = getMesAtualNome();
      const existe = list.includes(mesAtual);
      setMonth(existe ? mesAtual : j.currentMonth || "");
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
      const [d, l] = await Promise.all([
        api("dashboard", { month }),
        api("list", { month }),
      ]);
      setTotals(d.totals || totals);
      setItems(l.items || []);
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  function brl(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // obrigatório: desc, value, type, nature
  function validateForm() {
    if (!form.desc || !form.value || !form.type || !form.nature) return false;
    return true;
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

      if (editing) {
        // ✅ UPDATE REAL (Apps Script updateEntry_ espera sheet/id e os campos no payload)
        await api("update", {
          sheet: editing.sheet,
          id: editing.id,
          date: form.date,
          desc: form.desc,
          type: form.type,
          nature: form.nature,
          pay: form.pay,
          value: form.value,
        });

        setEditing(null);
        setMsg("✅ Lançamento atualizado!");
      } else {
        await api("add", { month, ...form });
        setMsg("✅ Salvo!");
      }

      limparCampos();
      await refresh();
      setScreen("hist");
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  async function del(it) {
    if (!confirm("Excluir lançamento?")) return;
    try {
      await api("delete", { id: it.id, sheet: it.sheet });
      await refresh();
      setMsg("✅ Excluído!");
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  function brToISO(dateBR) {
    // dd/mm/aaaa -> aaaa-mm-dd
    if (!dateBR || typeof dateBR !== "string") return todayISO();
    const parts = dateBR.split("/");
    if (parts.length !== 3) return todayISO();
    const [dd, mm, yyyy] = parts;
    if (!yyyy || !mm || !dd) return todayISO();
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  function startEdit(it) {
    setEditing({ id: it.id, sheet: it.sheet });

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
    setEditing(null);
    limparCampos();
    setMsg("");
  }

  function valueClassByType(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("receb")) return styles.valorRecebimento;
    if (t.includes("gasto")) return styles.valorGasto;
    return "";
  }

  const monthsOptions = useMemo(() => {
    return (months || []).map((m) => ({
      value: m,
      label: formatMonthLabel(m),
    }));
  }, [months]);

  return (
    <div className={styles.app}>
      {/* TOPO */}
      <header className={styles.topbar}>
        <h1>Controle Financeiro • JVAZ87</h1>

        {/* ✅ mês selecionado controla histórico e dashboard */}
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
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
        <section className={styles.dash}>
          <div className={styles.dashTopRow}>
            <div className={styles.dashMonthPill}>{formatMonthLabel(month)}</div>

            <select
              className={styles.monthSelectInline}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {monthsOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Recebimentos</div>
              <div className={`${styles.kpiValue} ${styles.valorRecebimento}`}>
                {brl(totals.recebimento)}
              </div>
              <div className={styles.kpiHint}>Total no mês</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Gastos</div>
              <div className={`${styles.kpiValue} ${styles.valorGasto}`}>
                {brl(totals.gasto)}
              </div>
              <div className={styles.kpiHint}>Total no mês</div>
            </div>

            <div className={styles.kpiCardWide}>
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
                const perc = rec > 0 ? Math.min(100, (gas / rec) * 100) : gas > 0 ? 100 : 0;

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
          <div className={styles.formHeaderRow}>
            <div className={styles.formTitle}>
              {editing ? "✏️ Editar lançamento" : "➕ Novo lançamento"}
            </div>

            {editing && (
              <button className={styles.ghostBtn} onClick={cancelEdit}>
                Cancelar edição
              </button>
            )}
          </div>

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          <input
            placeholder="Descrição *"
            value={form.desc}
            required
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />

          <input
            placeholder="Valor (ex: 12,50) *"
            value={form.value}
            required
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />

          <select
            value={form.type}
            required
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="">Tipo *</option>
            <option>Gasto</option>
            <option>Recebimento</option>
          </select>

          <select
            value={form.nature}
            required
            onChange={(e) => setForm({ ...form, nature: e.target.value })}
          >
            <option value="">Natureza *</option>
            <option>Fixo</option>
            <option>Variável</option>
          </select>

          <select value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })}>
            <option value="">Pagamento</option>
            <option>Débito</option>
            <option>Crédito</option>
          </select>

          <div className={styles.row2}>
            <button onClick={save} className={styles.primaryBtn}>
              {editing ? "Salvar alterações" : "Salvar"}
            </button>
            <button onClick={() => setScreen("home")}>Cancelar</button>
          </div>
        </section>
      )}

      {/* HIST */}
      {screen === "hist" && (
        <section className={styles.card}>
          {/* filtro por mês (sincroniza dashboard pois muda "month") */}
          <div className={styles.filtroMes}>
            <label>Mês</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthsOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {items.length === 0 ? (
            <div className={styles.empty}>Sem lançamentos neste mês.</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <strong>{it.desc}</strong>
                  <span className={styles.badge}>{it.type}</span>
                </div>

                <div className={styles.itemMeta}>
                  <span>{it.dateBR}</span>
                  <span className={valueClassByType(it.type)}>{brl(it.value)}</span>
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

      {msg && <div className={styles.msg}>{msg}</div>}
    </div>
  );
}
