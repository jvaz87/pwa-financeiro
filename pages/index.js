import { useEffect, useState } from "react";
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

  async function save() {
    try {
      if (!form.desc || !form.value || !form.type || !form.nature || !form.pay) {
        return setMsg("❌ Preencha todos os campos.");
      }

      await api("add", { month, ...form });

      setForm((prev) => ({ ...prev, value: "", desc: "" }));
      setMsg("✅ Salvo!");
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

  return (
    <div className={styles.app}>
      {/* TOPO */}
      <header className={styles.topbar}>
        <h1>Controle Financeiro • v2</h1>

        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
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
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Recebimentos</div>
              <div className={styles.kpiValue}>{brl(totals.recebimento)}</div>
              <div className={styles.kpiHint}>Total no mês</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Gastos</div>
              <div className={styles.kpiValue}>{brl(totals.gasto)}</div>
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

                // ✅ Correção: se rec = 0 e gas > 0, mostra 100% (vermelho)
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
                          perc >= 80 ? styles.barRed : perc >= 50 ? styles.barYellow : styles.barBlue
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
            placeholder="Valor (ex: 12,50)"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />

          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
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

          <select value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })}>
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
                  <span>{brl(it.value)}</span>
                </div>
                <button onClick={() => del(it)} className={styles.dangerBtn}>
                  Excluir
                </button>
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
