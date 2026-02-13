export default function App({ Component, pageProps }) {
  return (
    <>
      <style jsx global>{`
        /* Base */
        *{
          box-sizing:border-box;
          font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
        }

        /* =========================
           THEME TOKENS (DARK DEFAULT)
           ========================= */
        :root{
          --bg1:#081022;
          --bg2:#0b1220;

          --card: rgba(17,26,46,.92);
          --muted: rgba(232,238,255,.72);
          --text: #eef3ff;

          --accent:#6ea8ff;
          --danger:#ff6e6e;
          --ok:#63e6be;

          --line: rgba(255,255,255,.12);
          --radius:18px;

          --inputBg: rgba(255,255,255,.06);
          --btnBg: rgba(255,255,255,.04);
          --btnHover: rgba(110,168,255,.18);
        }

        /* =========================
           LIGHT THEME OVERRIDES
           ========================= */
        html[data-theme="light"], body[data-theme="light"]{
          --bg1:#f6f7fb;
          --bg2:#eef2ff;

          --card: rgba(255,255,255,.92);
          --muted: rgba(11,19,36,.62);
          --text: #0b1324;

          --accent:#2563eb;
          --danger:#dc2626;
          --ok:#16a34a;

          --line: rgba(11,19,36,.12);

          --inputBg: rgba(11,19,36,.06);
          --btnBg: rgba(11,19,36,.05);
          --btnHover: rgba(11,19,36,.09);
        }

        html, body{
          margin:0;
          min-height:100%;
          background: linear-gradient(180deg, var(--bg1), var(--bg2));
          color: var(--text);

          /* ✅ transição suave do tema */
          transition: background 260ms ease, color 260ms ease;
        }

        @media (prefers-reduced-motion: reduce){
          html, body{ transition:none !important; }
        }

        button{
          background:none;
          border:none;
          color:inherit;
        }

        input, select{
          background: var(--inputBg);
          border:1px solid var(--line);
          border-radius:14px;
          padding:12px;
          color: var(--text);
          font-size:15px;
          outline:none;
          transition: background 260ms ease, border-color 260ms ease, color 260ms ease, box-shadow 220ms ease;
        }

        select{
          appearance:none;
        }
      `}</style>

      <Component {...pageProps} />
    </>
  );
}
