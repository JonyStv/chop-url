import "./Navigation.css";

function NavigationItem({ id, svgPath, label, className = "" }) {
  return (
    <div className={`sidebar-nav-item ${className}`} id={id}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={svgPath} />
      </svg>
      <span>{label}</span>
    </div>
  );
}

export default NavigationItem;
