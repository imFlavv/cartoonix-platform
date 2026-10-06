export const WikiInfoBox = ({ data }) => (
  <aside data-testid="wiki-infobox" className="cx-wiki-card cx-wiki-glow p-5 w-full lg:w-72 shrink-0 float-none lg:float-right lg:ml-6 mb-6">
    <h3 className="font-black text-lg mb-3 cx-wiki-gradient-text">{data.title}</h3>
    <dl className="space-y-2.5">
      {data.rows.map(([label, value]) => (
        <div key={label} className="text-sm">
          <dt className="text-[#9b93c2] text-xs uppercase tracking-wide">{label}</dt>
          <dd className="text-white/85 font-medium mt-0.5">{value}</dd>
        </div>
      ))}
    </dl>
  </aside>
);
