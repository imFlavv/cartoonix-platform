// Mystery Box key icon.
export const KeyIcon = ({ className = "h-4 w-4", ...props }) => (
  <img src="/nix/key.png" alt="Cheie Mystery Box" draggable={false} className={`${className} object-contain select-none`} {...props} />
);

export default KeyIcon;
