import "./StatCard.css";
function StatCard({ title, value, svgPath }) {
  return (
    <article>
      <header>
        <h4>{title}</h4>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#607d8b"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={svgPath} />
        </svg>
      </header>
      <h1 id="totalClicks">{value}</h1>
      <footer>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4cd964"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19l16 0" />
          <path d="M4 15l4 -6l4 2l4 -5l4 4" />
        </svg>
        <p>+0% desde la semana pasada</p>
      </footer>
    </article>
  );
}
export default StatCard;
