import "./StatCard.css";
function StatCard({ title, value, svgPath, comparisonValue }) {
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
        <p>
          {comparisonValue > 0 ? `+${comparisonValue}` : comparisonValue}% desde
          la semana pasada
        </p>
      </footer>
    </article>
  );
}
export default StatCard;
