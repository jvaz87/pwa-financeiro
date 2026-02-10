export default function App({ Component, pageProps }) {
  return (
    <>
      <style jsx global>{`
        :root{
          --bg:#0b1220;
          --card:#111a2e;
          --muted:#9fb0d0;
          --text:#eef3ff;
          --accent:#6ea8ff;
          --danger:#ff6e6e;
          --ok:#63e6be;
          --line:rgba(255,255,255,.08);
          --radius:18px;
        }

        *{
          box-sizing:border-box;
          font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
        }

        html, body{
          margin:0;
          min-height:100%;
          background:linear-gradient(180deg,#081022, #0b1220);
          color:var(--text);
        }

        button{
          background:none;
          border:none;
          color:inherit;
        }

        input, select{
          background:rgba(255,255,255,.04);
          border:1px solid var(--line);
          border-radius:14px;
          padding:12px;
          color:var(--text);
          font-size:15px;
          outline:none;
        }

        select{
          appearance:none;
        }
      `}</style>

      <Component {...pageProps} />
    </>
  );
}
