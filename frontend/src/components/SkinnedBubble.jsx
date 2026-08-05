// PLUS chat bubble with 3-part image skins (capybara, etc.)
// Renders a left cap, tileable center body, and right cap.
// Images are loaded via inline style so webpack/css-loader doesn't try to resolve them.
import React from "react";

const SKIN_ASSETS = {
  capybara: {
    className: "cx-bubble-capybara",
    left: "/chat/bubbles/capybara/left.png",
    center: "/chat/bubbles/capybara/center.png",
    right: "/chat/bubbles/capybara/right.png",
  },
  ice: {
    className: "cx-bubble-ice",
    left: "/chat/bubbles/ice/left.png",
    center: "/chat/bubbles/ice/center.png",
    right: "/chat/bubbles/ice/right.png",
  },
};

export function SkinnedBubble({ skin, textClasses = "", children, testId }) {
  const cfg = SKIN_ASSETS[skin];
  if (!cfg) return null;
  return (
    <div data-testid={testId} className={`cx-bubble ${cfg.className}`}>
      <div
        className="cx-bubble-cap-left"
        aria-hidden="true"
        style={{ backgroundImage: `url(${cfg.left})` }}
      />
      <div
        className="cx-bubble-cap-body"
        style={{ backgroundImage: `url(${cfg.center})` }}
      >
        <span className={`cx-bubble-cap-body-text ${textClasses}`}>{children}</span>
      </div>
      <div
        className="cx-bubble-cap-right"
        aria-hidden="true"
        style={{ backgroundImage: `url(${cfg.right})` }}
      />
    </div>
  );
}
