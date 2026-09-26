// Official Cartoonix currency icon (NIX).
export const NixCoin = ({ className = "h-4 w-4", ...props }) => (
  <img src="/nix/coin.png" alt="NIX" draggable={false} className={`${className} object-contain select-none`} {...props} />
);

export default NixCoin;
