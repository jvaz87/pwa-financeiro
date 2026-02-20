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
    yearTotals: { gasto: 0, recebimento: 0, saldo: 0 },
  });

  const [msg, setMsg] = useState("");

  // Tema
  const [theme, setTheme] = useState("dark");

  // Buscar histórico
  const [q, setQ] = useState("");

  // Import CSV
  const [importing, setImporting] = useState(false);

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

  // ---------- Valor inteligente ----------
  function onlyDigits(s) {
    return String(s || "").replace(/\D/g, "");
  }

  // "1234" => "12,34"
  function digitsToBRLString(input) {
    const d = onlyDigits(input);
    const cents = Number(d || "0");
    const v = cents / 100;
    return v.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function normalizeValueToBRString(valueText) {
    const digits = onlyDigits(valueText);
    if (!digits) return "";
    return digitsToBRLString(digits);
  }

  // ---------- Lançar ----------
  async function save() {
    try {
      setMsg("");

      // obrigatórios (mantive pagamento obrigatório pra bater com o backend)
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
      value:
        it.value != null
          ? Number(it.value).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "",
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

      if (
        !editForm.desc ||
        !editForm.value ||
        !editForm.type ||
        !editForm.nature ||
        !editForm.pay
      ) {
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

  // ---------- CSV Backup completo ----------
  async function exportCSV() {
    try {
      setMsg("");
      const j = await api("export_csv", { scope: "all" }); // só completo
      const csv = j.csv || "";
      const filename = j.filename || "backup-completo.csv";

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMsg("✅ Backup CSV exportado!");
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  async function importCSVFile(file) {
    try {
      setMsg("");
      setImporting(true);
      const text = await file.text();
      const j = await api("import_csv", { csv: text });
      setMsg(`✅ Importado! Linhas: ${j.inserted} • Ignoradas: ${j.skipped}`);
      await refresh();
      setScreen("hist");
    } catch (e) {
      setMsg("❌ " + e.message);
    } finally {
      setImporting(false);
    }
  }

  // ---------- PDF ----------
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function exportPDF() {
    const rows = filteredItems; // respeita busca no histórico; quer sempre tudo do mês? use "items"
    const title = `Relatório • ${fmtMonth(month)}`;
    const now = new Date().toLocaleString("pt-BR");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    *{ box-sizing:border-box; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; }
    body{ margin:24px; color:#0b1324; }
    h1{ margin:0 0 6px; font-size:20px; }
    .muted{ color:rgba(11,19,36,.62); font-weight:700; font-size:12px; }
    .kpis{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin:14px 0 18px; }
    .card{ border:1px solid rgba(11,19,36,.12); border-radius:14px; padding:12px; }
    .label{ font-size:12px; font-weight:900; color:rgba(11,19,36,.62); }
    .value{ margin-top:6px; font-size:16px; font-weight:1000; }
    .green{ color:#16a34a; }
    .red{ color:#dc2626; }
    .saldoPos{ color:#0f766e; }
    .saldoNeg{ color:#dc2626; }
    table{ width:100%; border-collapse:collapse; }
    th, td{ border-bottom:1px solid rgba(11,19,36,.12); padding:10px 8px; text-align:left; font-size:12px; }
    th{ font-size:12px; color:rgba(11,19,36,.62); font-weight:1000; }
    .right{ text-align:right; }
    .badge{ display:inline-block; padding:2px 8px; border-radius:999px; border:1px solid rgba(11,19,36,.12); font-weight:900; font-size:11px; }
    .badgeG{ color:#dc2626; border-color:rgba(220,38,38,.25); background:rgba(220,38,38,.06);}
    .badgeR{ color:#16a34a; border-color:rgba(22,163,74,.25); background:rgba(22,163,74,.06);}
    @media print{ body{ margin:12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="muted">Gerado em ${escapeHtml(now)}</div>

  <div class="kpis">
    <div class="card">
      <div class="label">Recebimentos</div>
      <div class="value green">${escapeHtml(brl(totals.recebimento))}</div>
      <div class="muted">Fixo: ${escapeHtml(brl(totals.fixoReceb ?? 0))} • Variável: ${escapeHtml(brl(totals.variavelReceb ?? 0))}</div>
    </div>
    <div class="card">
      <div class="label">Gastos</div>
      <div class="value red">${escapeHtml(brl(totals.gasto))}</div>
      <div class="muted">Fixo: ${escapeHtml(brl(totals.fixoGasto ?? 0))} • Variável: ${escapeHtml(brl(totals.variavelGasto ?? 0))}</div>
    </div>
    <div class="card">
      <div class="label">Saldo</div>
      <div class="value ${Number(totals.saldo||0) >= 0 ? "saldoPos" : "saldoNeg"}">${escapeHtml(brl(totals.saldo))}</div>
      <div class="muted">Mês selecionado</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Descrição</th>
        <th>Tipo</th>
        <th>Natureza</th>
        <th>Pagamento</th>
        <th class="right">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows.map(it => `
          <tr>
            <td>${escapeHtml(it.dateBR)}</td>
            <td>${escapeHtml(it.desc)}</td>
            <td>
              <span class="badge ${String(it.type||"").toLowerCase()==="gasto" ? "badgeG" : "badgeR"}">
                ${escapeHtml(it.type)}
              </span>
            </td>
            <td>${escapeHtml(it.nature)}</td>
            <td>${escapeHtml(it.pay)}</td>
            <td class="right">${escapeHtml(brl(it.value))}</td>
          </tr>
        `).join("")
      }
    </tbody>
  </table>

  <script>setTimeout(() => window.print(), 250);</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return setMsg("❌ O navegador bloqueou pop-up. Permita pop-ups para exportar PDF.");
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  // ---------- Utils ----------
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

  const gasto = Number(totals.gasto || 0);
  const receb = Number(totals.recebimento || 0);
  const perc =
    receb > 0 ? Math.min(100, (gasto / receb) * 100) : gasto > 0 ? 100 : 0;

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

          <div className={styles.divider} />

          <button onClick={exportPDF}>📄 Exportar relatório (PDF)</button>

          <button onClick={exportCSV}>💾 Exportar backup (CSV)</button>

          <label className={styles.importBtn}>
            {importing ? "⏳ Importando..." : "📥 Importar backup (CSV)"}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) importCSVFile(f);
              }}
              style={{ display: "none" }}
            />
          </label>
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

          <div className={styles.dashActions3}>
            <button onClick={refresh}>Atualizar</button>
            <button onClick={exportPDF}>📄 PDF</button>
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
                        <span className={styles.badgeMuted}>
                          #{String(it.id).slice(0, 6)}
                        </span>
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
                            setEditForm((p) => ({
                              ...p,
                              value: normalizeValueToBRString(p.value),
                            }));
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
                            setEditForm({ ...editForm, nature: e.target.value })
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
                        <button
                          className={styles.primaryBtn}
                          onClick={submitEdit}
                        >
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
