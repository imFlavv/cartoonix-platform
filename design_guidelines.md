{
  "brand": {
    "name": "Cartoonix",
    "attributes": [
      "warm nostalgic",
      "premium-elegant (adult collectors vibe)",
      "colorful accents on deep dark base",
      "retro broadcast / VHS / CRT micro-textures",
      "playful but not childish"
    ],
    "north_star": "Feels like opening a premium ‘Saturday Morning’ vault: deep cinema-dark UI, warm neon accents, subtle grain/scanlines, and channel identities as collectible ‘badges’ rather than competing brands."
  },

  "design_tokens": {
    "notes": [
      "Dark mode is default. Light mode is a warm parchment variant (not pure white).",
      "Avoid purple/pink gradients (restricted). Use solid accents for Minimax pink/purple identity.",
      "Gradients only as large section backgrounds (<=20% viewport) and decorative overlays."
    ],

    "css_custom_properties": {
      "path": "/app/frontend/src/index.css",
      "instructions": [
        "Replace the current :root and .dark HSL tokens with the palette below.",
        "Keep shadcn variable names (background/foreground/card/etc.) so existing components inherit the new theme.",
        "Add extra brand tokens (e.g., --brand-jetix, --brand-cn, --brand-minimax) for channel cards/badges."
      ],
      "tokens": {
        ":root": {
          "--background": "36 33% 96%",
          "--foreground": "222 22% 12%",
          "--card": "36 40% 98%",
          "--card-foreground": "222 22% 12%",
          "--popover": "36 40% 98%",
          "--popover-foreground": "222 22% 12%",

          "--primary": "18 92% 45%",
          "--primary-foreground": "36 40% 98%",

          "--secondary": "210 22% 92%",
          "--secondary-foreground": "222 22% 12%",

          "--muted": "30 18% 92%",
          "--muted-foreground": "222 10% 40%",

          "--accent": "46 92% 55%",
          "--accent-foreground": "222 22% 12%",

          "--destructive": "0 78% 52%",
          "--destructive-foreground": "36 40% 98%",

          "--border": "30 14% 84%",
          "--input": "30 14% 84%",
          "--ring": "18 92% 45%",

          "--radius": "0.85rem",

          "--surface-1": "36 33% 96%",
          "--surface-2": "36 28% 93%",
          "--surface-3": "30 18% 90%",

          "--shadow-color": "222 22% 12%",

          "--brand-jetix": "18 92% 45%",
          "--brand-cn": "48 96% 55%",
          "--brand-minimax": "330 78% 55%",

          "--focus": "46 92% 55%"
        },

        ".dark": {
          "--background": "222 22% 7%",
          "--foreground": "36 40% 96%",

          "--card": "222 22% 9%",
          "--card-foreground": "36 40% 96%",

          "--popover": "222 22% 9%",
          "--popover-foreground": "36 40% 96%",

          "--primary": "18 92% 52%",
          "--primary-foreground": "222 22% 7%",

          "--secondary": "222 18% 14%",
          "--secondary-foreground": "36 40% 96%",

          "--muted": "222 16% 13%",
          "--muted-foreground": "30 10% 70%",

          "--accent": "46 92% 55%",
          "--accent-foreground": "222 22% 7%",

          "--destructive": "0 70% 45%",
          "--destructive-foreground": "36 40% 96%",

          "--border": "222 16% 18%",
          "--input": "222 16% 18%",
          "--ring": "46 92% 55%",

          "--radius": "0.85rem",

          "--surface-1": "222 22% 7%",
          "--surface-2": "222 20% 10%",
          "--surface-3": "222 18% 13%",

          "--shadow-color": "0 0% 0%",

          "--brand-jetix": "18 92% 52%",
          "--brand-cn": "48 96% 55%",
          "--brand-minimax": "330 78% 60%",

          "--focus": "46 92% 55%"
        }
      }
    },

    "palette": {
      "dark_mode": {
        "bg": "#0E1116 (HSL 222 22% 7%)",
        "panel": "#121722 (HSL 222 22% 9%)",
        "panel_2": "#171D2A (HSL 222 20% 10%)",
        "text": "#F6EFE6 (warm off-white)",
        "muted_text": "#B9B0A6",
        "border": "#242B3A",
        "primary": "Jetix Ember #FF5A2A",
        "accent": "CN Popcorn #FFD84A",
        "minimax": "Minimax Berry #F05AA6 (solid only)"
      },
      "light_mode": {
        "bg": "#FBF4E8 (warm parchment)",
        "panel": "#FFF9F0",
        "text": "#141824",
        "muted_text": "#4B5563",
        "border": "#E7DCCB",
        "primary": "#E94B1F",
        "accent": "#FFC93A",
        "minimax": "#E84C9A"
      },
      "allowed_gradients": [
        {
          "name": "Hero Warm Broadcast (background only)",
          "css": "radial-gradient(1200px circle at 20% 10%, rgba(255,90,42,0.18), transparent 55%), radial-gradient(900px circle at 80% 20%, rgba(255,216,74,0.14), transparent 60%), radial-gradient(900px circle at 60% 90%, rgba(240,90,166,0.10), transparent 55%)",
          "rule": "Use only as section background overlay; keep under 20% viewport impact (fade to solid)."
        }
      ]
    },

    "spacing": {
      "philosophy": "Use 2–3x more spacing than default shadcn demos. Streaming UIs feel premium when breathable.",
      "container": "max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8",
      "section_padding": "py-10 sm:py-14 lg:py-18",
      "card_gap": "gap-4 sm:gap-5 lg:gap-6"
    },

    "radius_and_shadows": {
      "radius": {
        "card": "rounded-[var(--radius)]",
        "media_thumb": "rounded-xl",
        "button": "rounded-xl",
        "pill": "rounded-full"
      },
      "shadows": {
        "card": "shadow-[0_10px_30px_rgba(0,0,0,0.35)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.55)]",
        "hover_lift": "hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(0,0,0,0.55)]",
        "focus_ring": "focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      }
    }
  },

  "typography": {
    "font_pair": {
      "display": {
        "name": "Bebas Neue",
        "use": "H1/Hero titles, channel headings, big CTA labels (nostalgic bold).",
        "google_fonts": "https://fonts.google.com/specimen/Bebas+Neue"
      },
      "body": {
        "name": "Manrope",
        "use": "Body, UI labels, forms, tables (clean modern).",
        "google_fonts": "https://fonts.google.com/specimen/Manrope"
      }
    },
    "implementation": {
      "instructions": [
        "Load fonts in /app/frontend/public/index.html via Google Fonts <link> tags.",
        "Set body font to Manrope; set headings via utility class font-display.",
        "Add Tailwind fontFamily extension if config exists; otherwise use CSS variables + className."
      ],
      "css_snippet": "/* index.css */\n:root{ --font-body: 'Manrope', ui-sans-serif, system-ui; --font-display: 'Bebas Neue', ui-sans-serif; }\nbody{ font-family: var(--font-body); }\n.font-display{ font-family: var(--font-display); letter-spacing: 0.02em; }"
    },
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-display",
      "h2": "text-base md:text-lg text-muted-foreground",
      "section_title": "text-2xl sm:text-3xl font-display",
      "card_title": "text-lg sm:text-xl font-semibold",
      "body": "text-sm sm:text-base",
      "caption": "text-xs text-muted-foreground"
    }
  },

  "texture_and_motifs": {
    "motifs": [
      "Subtle film grain overlay (CSS noise)",
      "CRT scanline overlay (very low opacity)",
      "Halftone dot corner stamps on hero/category cards",
      "Retro ‘sticker’ badges for channel + plan",
      "Rounded ‘TV bezel’ frames for video player"
    ],
    "css_overlays": {
      "noise": {
        "class": "before:pointer-events-none before:absolute before:inset-0 before:opacity-[0.06] before:mix-blend-overlay before:bg-[url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.35\"/></svg>')]",
        "usage": "Apply to hero wrapper and admin shell background only (not on text-heavy cards)."
      },
      "scanlines": {
        "class": "after:pointer-events-none after:absolute after:inset-0 after:opacity-[0.05] after:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] after:bg-[length:100%_4px]",
        "usage": "Apply to video player container and hero only."
      }
    }
  },

  "layout_patterns": {
    "global": {
      "app_shell": "Sticky top nav + content; dashboard/admin use left sidebar on desktop and Drawer on mobile.",
      "reading_flow": "Left-aligned typography; avoid centered paragraphs except hero tagline.",
      "grid": {
        "cartoon_grid": "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5",
        "episode_list": "space-y-2",
        "dashboard_cards": "grid grid-cols-1 lg:grid-cols-3 gap-4"
      }
    },

    "home_hero": {
      "structure": [
        "TopNav (logo, search, theme toggle, login/register or user menu)",
        "Hero: left copy + right featured carousel (optional)",
        "Below hero: 3 Channel Category Cards (big, collectible)"
      ],
      "hero_background": "Use allowed hero gradient overlay + noise. Keep content area solid card surfaces.",
      "cta": "Primary CTA: ‘Start Watching’ (Plus upsell secondary)."
    },

    "category_cards": {
      "goal": "Distinct channel identity without fragmenting the brand.",
      "unifying_rules": [
        "Same card geometry: TV bezel frame + inner poster area + bottom metadata strip.",
        "Same typography + spacing.",
        "Channel differences only via: accent stripe, badge color, subtle pattern, and logo treatment.",
        "No full-card gradients; use solid + faint radial glow behind logo (opacity <= 0.18)."
      ],
      "per_channel_styles": {
        "jetix_foxkids": {
          "accent": "bg-[hsl(var(--brand-jetix))]",
          "pattern": "tiny diagonal hatch (CSS background-size 8px) at 6% opacity",
          "badge": "Badge variant: solid ember with dark text"
        },
        "cartoon_network": {
          "accent": "bg-[hsl(var(--brand-cn))]",
          "pattern": "checker micro-pattern at 5% opacity",
          "badge": "Badge variant: popcorn yellow with near-black text"
        },
        "minimax": {
          "accent": "bg-[hsl(var(--brand-minimax))]",
          "pattern": "polka micro-dots at 5% opacity",
          "badge": "Badge variant: berry pink with white text (solid only)"
        }
      },
      "card_classes": "group relative overflow-hidden rounded-2xl border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/55 p-5 sm:p-6 shadow-[0_14px_40px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 transition-transform duration-200",
      "logo_treatment": "Place logo in a rounded-xl panel with subtle inner shadow; add a faint glow behind logo using a pseudo-element."
    },

    "cartoon_card": {
      "thumbnail": "Use AspectRatio (16/9) with image cover; add subtle vignette overlay on hover.",
      "meta": "Title + year + 1-line description; show ‘Plus’ lock icon for Plus-only playlists.",
      "hover": "Lift + border highlight + play icon fade-in.",
      "empty_state": "Use Skeleton + friendly copy: ‘No cartoons yet—admin can add the first classic.’"
    },

    "cartoon_detail": {
      "layout": "Two-column on lg: left synopsis + actions; right episode list in ScrollArea. On mobile: stacked.",
      "actions": [
        "Favorite toggle",
        "Add to playlist (Plus)",
        "Share"
      ],
      "player": "Use TV bezel container with scanlines overlay at 5% opacity."
    },

    "watch_page": {
      "layout": "Full-bleed player within max container; below: next episode rail carousel.",
      "controls": "Use shadcn Slider for volume/progress if custom; otherwise rely on ReactPlayer controls."
    },

    "registration_wizard": {
      "pattern": "3-step wizard with Progress + Tabs-like stepper (custom).",
      "step_1": "Avatar grid (12–15) using Card + selectable state; form fields below.",
      "step_2": "Plan selection cards (Free vs Plus) with comparison Table.",
      "step_3": "OTP verification using shadcn InputOTP (6 digits).",
      "mobile": "Single column; sticky bottom CTA bar (Continue/Back)."
    },

    "dashboard": {
      "layout": "Top summary row (subscription badge, watch streak, favorites count) + tabs for History/Favorites/Playlists.",
      "plus_gating": "Show locked Playlists tab with tooltip + upgrade CTA."
    },

    "admin_panel": {
      "layout": "Sidebar + main content. Sidebar collapses to Sheet on mobile.",
      "tables": "Use shadcn Table with sticky header; row hover highlight.",
      "forms": "Use shadcn Form + Input/Select/Textarea; dual upload: Tabs (Upload File / Paste URL)."
    }
  },

  "component_styling": {
    "buttons": {
      "approach": "Premium ‘action-first’ with rounded-xl, subtle glow, press scale 0.98. No gradients on small buttons.",
      "variants": {
        "primary": "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-[1.03] active:scale-[0.98]",
        "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        "ghost": "hover:bg-accent/15 hover:text-foreground",
        "channel": "Use outline + left accent stripe (not full fill)"
      },
      "data_testid": [
        "data-testid=\"primary-cta-button\"",
        "data-testid=\"theme-toggle-button\"",
        "data-testid=\"login-submit-button\"",
        "data-testid=\"register-next-step-button\""
      ]
    },

    "cards": {
      "approach": "Glass-tinted panels on dark mode: bg-card/60 + backdrop-blur + crisp border.",
      "classes": "rounded-2xl border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/55",
      "hover": "transition-transform duration-200 hover:-translate-y-0.5"
    },

    "badges": {
      "subscription": {
        "free": "bg-muted text-muted-foreground",
        "plus": "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
      },
      "channel_badges": {
        "jetix": "bg-[hsl(var(--brand-jetix))] text-black",
        "cn": "bg-[hsl(var(--brand-cn))] text-black",
        "minimax": "bg-[hsl(var(--brand-minimax))] text-white"
      }
    },

    "inputs": {
      "approach": "Slightly taller inputs (h-11) with warm focus ring; avoid harsh neon.",
      "classes": "h-11 rounded-xl bg-background/40 dark:bg-card/40 border-border focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus))]",
      "otp": "Use shadcn InputOTP with spacing and clear focus state."
    },

    "navigation": {
      "top_nav": "Use NavigationMenu + DropdownMenu for user menu; Search input centered on desktop.",
      "sidebar": "Use Collapsible groups; active item has left accent bar + subtle bg."
    }
  },

  "motion": {
    "library": "Framer Motion",
    "principles": [
      "Fast UI: 160–220ms for hover/press; 280–420ms for page/section entrances.",
      "Use transform + opacity only (avoid layout thrash).",
      "Respect prefers-reduced-motion: disable parallax + reduce durations."
    ],
    "patterns": {
      "page_enter": "initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{duration:0.35, ease:[0.22,1,0.36,1]}}",
      "card_hover": "whileHover={{y:-4}} transition={{type:'spring', stiffness:260, damping:22}}",
      "stagger_grid": "Use parent variants with staggerChildren: 0.04 for cartoon grids.",
      "wizard_step": "Animate step content crossfade + slight x shift (x: 12 -> 0).",
      "channel_glow": "On hover, fade in a pseudo-element glow behind logo (opacity 0 -> 1)."
    }
  },

  "iconography": {
    "library": "lucide-react (preferred) + FontAwesome CDN if needed",
    "icons": {
      "play": "Play",
      "favorite": "Heart",
      "history": "History",
      "playlist": "ListMusic",
      "settings": "Settings",
      "admin": "Shield",
      "upload": "Upload",
      "link": "Link",
      "users": "Users",
      "subscriptions": "CreditCard"
    },
    "decorative": "Use small ‘sticker’ SVGs (stars, tickets, VHS label shapes) as background accents at low opacity (<=0.12)."
  },

  "email_design_brevo": {
    "tone": "Premium nostalgic. Avoid childish clipart. Use warm paper + bold display headings.",
    "layout": [
      "Header: Cartoonix wordmark + thin accent stripe",
      "Hero block: verification code in big monospace-like digits inside rounded card",
      "Footer: support links + unsubscribe"
    ],
    "colors": {
      "bg": "#0E1116",
      "card": "#121722",
      "primary": "#FF5A2A",
      "accent": "#FFD84A",
      "text": "#F6EFE6"
    },
    "otp_block": "Use 6-digit code with letter-spacing: 0.35em; font-size: 28–32px; background: #171D2A; border: 1px solid #242B3A; border-radius: 14px."
  },

  "image_urls": {
    "brand_texture": [
      {
        "category": "marketing/nostalgia",
        "description": "VHS/cassette pile for subtle background in marketing sections (use with heavy blur + low opacity).",
        "url": "https://images.unsplash.com/photo-1647743483851-cd4ca75d8ed5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "marketing/nostalgia",
        "description": "VHS/record close-up for footer or login side panel background (blurred).",
        "url": "https://images.unsplash.com/photo-1567675530747-0a4e5f8a309c?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ],
    "usage_rules": [
      "Never place readable text directly on photos; always add a solid scrim (bg-background/80) or blur.",
      "Prefer illustration-like UI (cards, badges) over heavy photography; photos only as subtle nostalgia texture."
    ]
  },

  "component_path": {
    "shadcn_ui": {
      "core": [
        "/app/frontend/src/components/ui/button.jsx",
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/input.jsx",
        "/app/frontend/src/components/ui/label.jsx",
        "/app/frontend/src/components/ui/tabs.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/sheet.jsx",
        "/app/frontend/src/components/ui/drawer.jsx",
        "/app/frontend/src/components/ui/navigation-menu.jsx",
        "/app/frontend/src/components/ui/dropdown-menu.jsx",
        "/app/frontend/src/components/ui/scroll-area.jsx",
        "/app/frontend/src/components/ui/progress.jsx",
        "/app/frontend/src/components/ui/input-otp.jsx",
        "/app/frontend/src/components/ui/skeleton.jsx",
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/switch.jsx",
        "/app/frontend/src/components/ui/carousel.jsx",
        "/app/frontend/src/components/ui/separator.jsx"
      ],
      "admin_forms": [
        "/app/frontend/src/components/ui/form.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/textarea.jsx",
        "/app/frontend/src/components/ui/checkbox.jsx",
        "/app/frontend/src/components/ui/radio-group.jsx"
      ],
      "toasts": [
        "/app/frontend/src/components/ui/sonner.jsx"
      ]
    },
    "third_party": {
      "react_player": "Use react-player for MP4/HLS embed; wrap in AspectRatio + TV bezel container.",
      "framer_motion": "Use for page transitions, hover lifts, staggered grids.",
      "optional": [
        "lottie-react for tiny nostalgic loading animations (tape rewind / bouncing TV)"
      ]
    }
  },

  "instructions_to_main_agent": {
    "global_css_fixes": [
      "Remove/stop using /app/frontend/src/App.css default CRA centering styles (App-header align center). Do not center the whole app.",
      "Keep App.css minimal or delete references; rely on Tailwind + index.css tokens.",
      "Ensure html has className 'dark' by default (or set via theme provider) and provide toggle using shadcn Switch or Button."
    ],
    "testing_attributes": {
      "rule": "All interactive and key informational elements MUST include data-testid.",
      "examples": [
        "data-testid=\"home-channel-card-jetix\"",
        "data-testid=\"home-channel-card-cartoon-network\"",
        "data-testid=\"home-channel-card-minimax\"",
        "data-testid=\"cartoon-grid-card\"",
        "data-testid=\"cartoon-detail-favorite-button\"",
        "data-testid=\"watch-player\"",
        "data-testid=\"register-avatar-option\"",
        "data-testid=\"plan-select-plus\"",
        "data-testid=\"otp-submit-button\"",
        "data-testid=\"admin-sidebar-nav\"",
        "data-testid=\"admin-cartoons-create-button\""
      ]
    },
    "channel_logo_handling": [
      "Treat channel logos as monochrome marks placed on a tinted plaque (rounded-xl) to unify.",
      "Use per-channel accent stripe + badge color; avoid full background takeover.",
      "If official logos vary wildly, normalize via CSS: max-h-10, object-contain, and apply drop-shadow at low opacity."
    ],
    "accessibility": [
      "Maintain WCAG AA contrast: warm off-white text on dark panels; avoid low-contrast gray on gray.",
      "Focus states: always visible ring using --focus.",
      "Reduced motion: disable parallax/scanline animation when prefers-reduced-motion."
    ]
  },

  "general_ui_ux_design_guidelines": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    "",
    " **GRADIENT RESTRICTION RULE**",
    "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc",
    "NEVER use dark gradients for logo, testimonial, footer etc",
    "NEVER let gradients cover more than 20% of the viewport.",
    "NEVER apply gradients to text-heavy content or reading areas.",
    "NEVER use gradients on small UI elements (<100px width).",
    "NEVER stack multiple gradient layers in the same viewport.",
    "",
    "**ENFORCEMENT RULE:**",
    "    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors",
    "",
    "**How and where to use:**",
    "   • Section backgrounds (not content backgrounds)",
    "   • Hero section header content. Eg: dark to light to dark color",
    "   • Decorative overlays and accent elements only",
    "   • Hero section with 2-3 mild color",
    "   • Gradients creation can be done for any angle say horizontal, vertical or diagonal",
    "",
    "- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc",
    "",
    "</Font Guidelines>",
    "",
    "- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead.",
    "",
    "- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.",
    "",
    "- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.",
    "",
    "- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly",
    "    Eg: - if it implies playful/energetic, choose a colorful scheme",
    "           - if it implies monochrome/minimal, choose a black–white/neutral scheme",
    "",
    "**Component Reuse:**",
    "\t- Prioritize using pre-existing components from src/components/ui when applicable",
    "\t- Create new components that match the style and conventions of existing components when needed",
    "\t- Examine existing components to understand the project's component patterns before creating new ones",
    "",
    "**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component",
    "",
    "**Best Practices:**",
    "\t- Use Shadcn/UI as the primary component library for consistency and accessibility",
    "\t- Import path: ./components/[component-name]",
    "",
    "**Export Conventions:**",
    "\t- Components MUST use named exports (export const ComponentName = ...)",
    "\t- Pages MUST use default exports (export default function PageName() {...})",
    "",
    "**Toasts:**",
    "  - Use `sonner` for toasts\"",
    "  - Sonner component are located in `/app/src/components/ui/sonner.tsx`",
    "",
    "Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
