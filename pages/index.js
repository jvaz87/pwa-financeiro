import { useEffect, useState } from "react";
import "../styles/app.css";

export default function Home() {
  const [screen, setScreen] = useState("home");
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState("");
  const [totals, setTotals] = useState({ gasto:0, recebimento:0, saldo:0, fixo:0, variavel:0 });
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    date: isoToday(), value:"", desc:"", type:"", nature:"", pay:""
  });

  const [edit, setEdit] = useState(null); // {id,sheet,date,value,desc,type,nature,pay}

  useEffect(() => {
    // register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(()=>{});
    }
    init();
  }, []);

  async function api(action, data) {
    const r = await fetch("/api/gs", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action, data })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "Erro");
    return j;
  }

  async function init() {
    try {
      const j = await api("init", {});
      setMonths(j.months);
      setMonth(j.currentMonth);
      setMsg("");
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  useEffect(() => {
    if (!month) return;
    refresh();
  }, [month]);

  async function refresh() {
    try {
      setMsg("");
      const [d, l] = await Promise.all([
        api("dashboard", { month }),
        api("list", { month })
      ]);
      setTotals(d.totals);
      setItems(l.items);
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  function isoToday() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function brl(n) {
    try { return Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
    catch { return "R$ " + n; }
  }

  function go(s) { setScreen(s); }

  async function save() {
    try {
      if (!form.date) return setMsg("❌ Escolha a data.");
      if (!form.desc) return setMsg("❌ Digite a descrição.");
      if (!form.type) return setMsg("❌ Selecione o tipo.");
      if (!form.nature) return setMsg("❌ Selecione a natureza.");
      if (!form.pay) return setMsg("❌ Selecione Débito/Crédito.");
      if (!form.value) return setMsg("❌ Digite o valor.");

      setMsg("Salvando…");
      await api("add", { month, ...form });
      setMsg("✅ Salvo!");
      setForm({ ...form, value:"", desc:"" });
      await refresh();
      go("hist");
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  async function applyEdit() {
    try {
      if (!edit?.desc) return;
      setMsg("Salvando edição…");
      await api("update", edit);
      setEdit(null);
      setMsg("✅ Atualizado!");
      await refresh();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  async function del(it) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      setMsg("Excluindo…");
      await api("delete", { id: it.id, sheet: it.sheet });
      setMsg("✅ Excluído!");
      await refresh();
    } catch (e) {
      setMsg("❌ " + e.message);
    }
  }

  const chip = month ? `Mês: ${month}` : "Carregando…";

  const pctFixo = Math.min(100, Math.max(0, (totals.fixo / Math.max(0.00001, totals.gasto)) * 100));

  return (
    <>
      <HeadMeta />

      <div className="wrap">
        <div className="topbar">
          <div className="title">Controle Financeiro</div>
          <div className="chip">{chip}</div>
        </div>

        {/* HOME */}
        <div className={`screen ${screen==="home" ? "active":""}`}>
          <div className="card">
            <div style={{
              padding:14,borderRadius:18,border:"1px solid var(--line)",
              background:"linear-gradient(180deg, rgba(110,168,255,.18), rgba(255,255,255,.03))"
            }}>
              <div style={{fontSize:18,fontWeight:950}}>Bem-vindo 👋</div>
              <div style={{color:"var(--muted)",fontWeight:900,marginTop:6,fontSize:13}}>
                Seu controle em formato de app. Escolha uma ação abaixo.
              </div>
            </div>

            <div className="grid1" style={{marginTop:12}}>
              <div>
                <label>Mês</label>
                <select value={month} onChange={(e)=>setMonth(e.target.value)}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div style={{display:"grid",gap:10,marginTop:12}}>
              <div className="bigBtn" onClick={()=>go("dash")}>
                <div>📊 Dashboard<br/><span>Saldo, gastos e recebimentos</span></div>
                <div style={{opacity:.7}}>›</div>
              </div>
              <div className="bigBtn" onClick={()=>go("add")}>
                <div>➕ Lançar<br/><span>Adicionar gasto/recebimento</span></div>
                <div style={{opacity:.7}}>›</div>
              </div>
              <div className="bigBtn" onClick={()=>go("hist")}>
                <div>🧾 Histórico<br/><span>Ver, editar e excluir</span></div>
                <div style={{opacity:.7}}>›</div>
              </div>
            </div>

            <div className="msg">{msg}</div>
          </div>
        </div>

        {/* DASH */}
        <div className={`screen ${screen==="dash" ? "active":""}`}>
          <div className="card">
            <div className="grid1">
              <div>
                <label>Mês</label>
                <select value={month} onChange={(e)=>setMonth(e.target.value)}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid" style={{marginTop:10}}>
              <div style={{padding:12,borderRadius:16,border:"1px solid var(--line)",background:"rgba(255,255,255,.03)"}}>
                <div style={{color:"var(--muted)",fontWeight:900,fontSize:12}}>Gastos</div>
                <div style={{fontWeight:950,fontSize:16,marginTop:6}}>{brl(totals.gasto)}</div>
              </div>
              <div style={{padding:12,borderRadius:16,border:"1px solid var(--line)",background:"rgba(255,255,255,.03)"}}>
                <div style={{color:"var(--muted)",fontWeight:900,fontSize:12}}>Recebimentos</div>
                <div style={{fontWeight:950,fontSize:16,marginTop:6}}>{brl(totals.recebimento)}</div>
              </div>
            </div>

            <div style={{marginTop:10,padding:12,borderRadius:16,border:"1px solid var(--line)",background:"rgba(255,255,255,.03)"}}>
              <div style={{color:"var(--muted)",fontWeight:900,fontSize:12}}>Saldo</div>
              <div style={{fontWeight:950,fontSize:18,marginTop:6}}>{brl(totals.saldo)}</div>
            </div>

            <div style={{marginTop:10,padding:12,borderRadius:16,border:"1px solid var(--line)",background:"rgba(255,255,255,.03)"}}>
              <div style={{fontWeight:950}}>Composição dos gastos</div>
              <div style={{marginTop:10,height:12,borderRadius:999,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
                <div style={{
                  width: `${pctFixo.toFixed(0)}%`,
                  height:"100%",
                  background:"linear-gradient(90deg, rgba(110,168,255,.95), rgba(99,230,190,.95))"
                }}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8,color:"var(--muted)",fontWeight:900,fontSize:12}}>
                <span>Fixo: {brl(totals.fixo)}</span>
                <span>Variável: {brl(totals.variavel)}</span>
              </div>
            </div>

            <div className="btnrow">
              <button className="btn2" onClick={()=>go("home")}>Voltar</button>
              <button className="btn" onClick={refresh}>Atualizar</button>
            </div>

            <div className="msg">{msg}</div>
          </div>
        </div>

        {/* ADD */}
        <div className={`screen ${screen==="add" ? "active":""}`}>
          <div className="card">
            <div className="grid1">
              <div>
                <label>Mês</label>
                <select value={month} onChange={(e)=>setMonth(e.target.value)}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid" style={{marginTop:10}}>
              <div>
                <label>Data</label>
                <input type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}/>
              </div>
              <div>
                <label>Valor (R$)</label>
                <input inputMode="decimal" placeholder="0,00" value={form.value}
                       onChange={(e)=>setForm({...form,value:e.target.value})}/>
              </div>
            </div>

            <div className="grid1" style={{marginTop:10}}>
              <div>
                <label>Descrição</label>
                <input placeholder="Ex.: Mercado, Internet…" value={form.desc}
                       onChange={(e)=>setForm({...form,desc:e.target.value})}/>
              </div>
            </div>

            <div className="grid" style={{marginTop:10}}>
              <div>
                <label>Tipo</label>
                <select value={form.type} onChange={(e)=>setForm({...form,type:e.target.value})}>
                  <option value="">Selecione…</option>
                  <option>Gasto</option>
                  <option>Recebimento</option>
                </select>
              </div>
              <div>
                <label>Natureza</label>
                <select value={form.nature} onChange={(e)=>setForm({...form,nature:e.target.value})}>
                  <option value="">Selecione…</option>
                  <option>Fixo</option>
                  <option>Variável</option>
                </select>
              </div>
            </div>

            <div className="grid1" style={{marginTop:10}}>
              <div>
                <label>Forma de pagamento</label>
                <select value={form.pay} onChange={(e)=>setForm({...form,pay:e.target.value})}>
                  <option value="">Selecione…</option>
                  <option>Débito</option>
                  <option>Crédito</option>
                </select>
              </div>
            </div>

            <div className="btnrow">
              <button className="btn" onClick={save}>Salvar</button>
              <button className="btn2" onClick={()=>setForm({...form,value:"",desc:""})}>Limpar</button>
            </div>

            <div className="msg">{msg}</div>
          </div>
        </div>

        {/* HIST */}
        <div className={`screen ${screen==="hist" ? "active":""}`}>
          <div className="card">
            <div className="grid1">
              <div>
                <label>Mês</label>
                <select value={month} onChange={(e)=>setMonth(e.target.value)}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="btnrow">
              <button className="btn2" onClick={()=>go("home")}>Voltar</button>
              <button className="btn" onClick={refresh}>Atualizar</button>
            </div>

            <div style={{display:"grid",gap:10,marginTop:10}}>
              {!items.length ? (
                <div className="msg">Sem lançamentos neste mês.</div>
              ) : items.slice(0,50).map(it => (
                <div key={it.id} style={{
                  display:"grid", gridTemplateColumns:"1fr auto", gap:10,
                  padding:12, borderRadius:16, border:"1px solid var(--line)",
                  background:"rgba(255,255,255,.03)"
                }}>
                  <div>
                    <div style={{fontSize:15,fontWeight:950,margin:"2px 0 6px"}}>{it.desc || "(sem descrição)"}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,color:"var(--muted)",fontWeight:900,fontSize:12}}>
                      <span>📅 {it.dateBR}</span>
                      <span>• {it.type}</span>
                      <span>• {it.nature}</span>
                      <span>• {it.pay}</span>
                    </div>
                    <div style={{fontSize:16,fontWeight:950,marginTop:8}}>{brl(it.value)}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button className="small edit" onClick={()=>setEdit(it)}>Editar</button>
                    <button className="small del" onClick={()=>del(it)}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="msg">{msg}</div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="nav">
        <div className="inner">
          <div className={`tab ${screen==="home"?"active":""}`} onClick={()=>go("home")}>🏠 Início</div>
          <div className={`tab ${screen==="dash"?"active":""}`} onClick={()=>go("dash")}>📊 Dash</div>
          <div className={`tab ${screen==="add" ?"active":""}`} onClick={()=>go("add")}>➕ Lançar</div>
          <div className={`tab ${screen==="hist"?"active":""}`} onClick={()=>go("hist")}>🧾 Histórico</div>
        </div>
      </div>

      {/* Modal simples de edição */}
      {edit && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"flex-end"
        }} onClick={()=>setEdit(null)}>
          <div className="card" style={{
            width:"100%", maxWidth:720, margin:"0 auto",
            borderRadius:"22px 22px 0 0"
          }} onClick={(e)=>e.stopPropagation()}>
            <div style={{fontWeight:950, fontSize:16}}>Editar lançamento</div>

            <div className="grid" style={{marginTop:10}}>
              <div>
                <label>Data</label>
                <input type="date" value={edit.date} onChange={(e)=>setEdit({...edit,date:e.target.value})}/>
              </div>
              <div>
                <label>Valor (R$)</label>
                <input inputMode="decimal" value={String(edit.value ?? "")}
                       onChange={(e)=>setEdit({...edit,value:e.target.value})}/>
              </div>
            </div>

            <div className="grid1" style={{marginTop:10}}>
              <div>
                <label>Descrição</label>
                <input value={edit.desc} onChange={(e)=>setEdit({...edit,desc:e.target.value})}/>
              </div>
            </div>

            <div className="grid" style={{marginTop:10}}>
              <div>
                <label>Tipo</label>
                <select value={edit.type} onChange={(e)=>setEdit({...edit,type:e.target.value})}>
                  <option>Gasto</option>
                  <option>Recebimento</option>
                </select>
              </div>
              <div>
                <label>Natureza</label>
                <select value={edit.nature} onChange={(e)=>setEdit({...edit,nature:e.target.value})}>
                  <option>Fixo</option>
                  <option>Variável</option>
                </select>
              </div>
            </div>

            <div className="grid1" style={{marginTop:10}}>
              <div>
                <label>Forma de pagamento</label>
                <select value={edit.pay} onChange={(e)=>setEdit({...edit,pay:e.target.value})}>
                  <option>Débito</option>
                  <option>Crédito</option>
                </select>
              </div>
            </div>

            <div className="btnrow">
              <button className="btn" onClick={applyEdit}>Salvar</button>
              <button className="btn2" onClick={()=>setEdit(null)}>Cancelar</button>
            </div>

            <div className="msg">{msg}</div>
          </div>
        </div>
      )}
    </>
  );
}

function HeadMeta() {
  return (
    <>
      {/* metas PWA */}
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#0b1220" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
      />
      {/* iOS icon */}
      <link rel="apple-touch-icon" href="/icons/icon-512.png" />
      <title>Controle Financeiro</title>
    </>
  );
}
