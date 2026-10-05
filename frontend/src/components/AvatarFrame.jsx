export const AvatarFrame = ({ src, frame, alt = "avatar", size = "h-14 w-14", ringClassName = "", className = "", testId }) => (
  <span className={`relative grid ${size} shrink-0 ${className}`}>
    <span
      className={`col-start-1 row-start-1 h-full w-full rounded-full overflow-hidden ${ringClassName}`}
      style={{ gridArea: "1 / 1" }}
    >
      <img src={src} alt={alt} data-testid={testId} className="h-full w-full object-cover bg-[#141414]" draggable={false} />
    </span>
    {frame && (
      <img
        src={frame}
        alt=""
        className="col-start-1 row-start-1 h-full w-full cx-avatar-frame-overlay"
        style={{ gridArea: "1 / 1" }}
        draggable={false}
      />
    )}
  </span>
);
