export const AvatarFrame = ({ src, frame, alt = "avatar", size = "h-14 w-14", ringClassName = "", className = "", testId }) => (
  <span className={`cx-avatar-wrapper relative inline-block ${size} shrink-0 ${className}`} style={{ overflow: "visible" }}>
    <span className={`block h-full w-full rounded-full overflow-hidden ${ringClassName}`}>
      <img src={src} alt={alt} data-testid={testId} className="h-full w-full object-cover bg-[#141414]" draggable={false} />
    </span>
    {frame && (
      <img
        src={frame}
        alt=""
        className="cx-avatar-frame-overlay"
        draggable={false}
      />
    )}
  </span>
);
