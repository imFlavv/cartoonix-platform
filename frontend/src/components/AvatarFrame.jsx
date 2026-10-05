import { AVATAR_FRAMES } from "@/data/constants";

const FRAME_SCALE = AVATAR_FRAMES.reduce((acc, f) => { acc[f.id] = f.scale || 130; return acc; }, {});

export const AvatarFrame = ({ src, frame, alt = "avatar", size = "h-14 w-14", ringClassName = "", className = "", testId }) => {
  const scale = FRAME_SCALE[frame] || 130;
  const offset = -(scale - 100) / 2;
  return (
    <span className={`relative inline-block ${size} shrink-0 ${className}`}>
      <span className={`block h-full w-full rounded-full overflow-hidden ${ringClassName}`}>
        <img src={src} alt={alt} data-testid={testId} className="h-full w-full object-cover bg-[#141414]" draggable={false} />
      </span>
      {frame && (
        <img
          src={frame}
          alt=""
          className="cx-avatar-frame-overlay"
          style={{ top: `${offset}%`, left: `${offset}%`, width: `${scale}%`, height: `${scale}%` }}
          draggable={false}
        />
      )}
    </span>
  );
};
