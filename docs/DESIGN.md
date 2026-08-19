# DESIGN.md: PocketFlow

## Brand & Visual Identity

PocketFlow embodies a modern, clean, and engaging aesthetic, designed to make personal finance management feel intuitive and rewarding. The visual identity combines sleek, minimalist UI elements with subtle gamified cues, aiming for a "slick" user experience that is both professional and approachable. The overall impression should be one of clarity, control, and positive financial progress.

## User Experience Goals

1.  **Engagement & Retention:** Achieve a DAU/MAU ratio of >20% by providing a visually appealing and gamified experience that encourages daily interaction.
2.  **Ease of Use:** Enable users to complete core tasks (e.g., adding a transaction, filling an envelope) in under 3 clicks/taps, minimizing cognitive load.
3.  **Financial Clarity:** Ensure users can quickly grasp their financial status and budget progress at a glance from the dashboard, reducing anxiety around money management.

## Color Palette

The palette is designed for a modern, clean, and vibrant feel, with clear semantic roles.

```css
:root {
  /* Primary Brand Colors */
  --color-primary-500: #4F46E5; /* Indigo 500 - Main brand color */
  --color-primary-600: #4338CA; /* Indigo 600 - Hover/Active */

  /* Secondary Action/Accent Colors */
  --color-secondary-500: #10B981; /* Emerald 500 - Success, positive progress */
  --color-secondary-600: #059669; /* Emerald 600 - Success hover */
  --color-accent-warning: #F59E0B; /* Amber 500 - Warning, approaching limits */
  --color-accent-danger: #EF4444; /* Red 500 - Danger, over budget */

  /* Neutral Colors */
  --color-neutral-50: #F9FAFB;   /* Gray 50 - Lightest background */
  --color-neutral-100: #F3F4F6;  /* Gray 100 - Secondary background */
  --color-neutral-200: #E5E7EB;  /* Gray 200 - Borders, dividers */
  --color-neutral-300: #D1D5DB;  /* Gray 300 - Disabled states */
  --color-neutral-400: #9CA3AF;  /* Gray 400 - Placeholder text */
  --color-neutral-500: #6B7280;  /* Gray 500 - Secondary text */
  --color-neutral-700: #374151;  /* Gray 700 - Primary text */
  --color-neutral-900: #111827;  /* Gray 900 - Headings, darkest text */

  /* Semantic Colors */
  --color-text-primary: var(--color-neutral-700);
  --color-text-secondary: var(--color-neutral-500);
  --color-background-primary: var(--color-neutral-50);
  --color-background-secondary: var(--color-neutral-100);
  --color-border: var(--color-neutral-200);
}
```

## Typography

A clean, modern sans-serif typeface ensures readability and a contemporary feel.

*   **Font Families:**
    *   Primary: `Inter` (sans-serif) - [Google Fonts Link](https://fonts.google.com/specimen/Inter)
    *   Fallback: `system-ui`, `sans-serif`
*   **Font Size Scale (Base 16px):**
    *   `text-xs`: 0.75rem (12px)
    *   `text-sm`: 0.875rem (14px)
    *   `text-base`: 1rem (16px)
    *   `text-lg`: 1.125rem (18px)
    *   `text-xl`: 1.25rem (20px)
    *   `text-2xl`: 1.5rem (24px)
    *   `text-3xl`: 1.875rem (30px)
    *   `text-4xl`: 2.25rem (36px)
    *   `text-5xl`: 3rem (48px)
*   **Font Weights:**
    *   `Light`: 300
    *   `Regular`: 400
    *   `Medium`: 500
    *   `SemiBold`: 600
    *   `Bold`: 700

## UI Components & Spacing

*   **Grid Unit:** 4px. All spacing, padding, and component dimensions will be multiples of 4px for consistency.
*   **Border-Radius Scale:**
    *   `rounded-sm`: 2px
    *   `rounded`: 4px
    *   `rounded-md`: 6px
    *   `rounded-lg`: 8px
    *   `rounded-xl`: 12px
    *   `rounded-full`: 9999px (for avatars, pills)
*   **Standard Spacing Values (based on 4px grid):**
    *   `space-xs`: 4px
    *   `space-sm`: 8px
    *   `space-md`: 16px
    *   `space-lg`: 24px
    *   `space-xl`: 32px
    *   `space-2xl`: 48px

## Screen Priorities

The following screens are critical for the core user experience and will receive the highest design and development priority for the `User` role:

1.  **Dashboard:** The primary overview of financial health, "Available to Spend," and envelope progress.
2.  **Transactions List & Detail:** Viewing, adding, editing, and categorizing transactions.
3.  **Envelope Management:** Creating, filling, and managing budget envelopes.
4.  **Onboarding & Account Linking (Plaid):** Initial setup and bank connection flow.
5.  **Insights & Reports:** Visualizations of spending, income, and net worth trends.

## Interaction & Motion

Interaction design focuses on providing immediate feedback and a fluid user experience.

*   **Hover States:** Subtle background color changes (e.g., `primary-500` to `primary-600`, `neutral-100` to `neutral-200`) or slight elevation (box-shadow) for interactive elements like buttons, cards, and list items.
*   **Transitions:** Smooth `ease-in-out` transitions for color changes, opacity, and transforms.
*   **Animation Durations:**
    *   Fast (e.g., button hovers, icon changes): 100ms
    *   Standard (e.g., modal open/close, card expansion): 200ms
    *   Slightly Slower (e.g., complex chart animations, page transitions): 300ms
*   **Gamified Feedback:** Micro-animations and celebratory visuals for achievements, successful budget adherence, or reaching financial milestones.

## Accessibility

Ensuring PocketFlow is usable by everyone is paramount.

*   **Contrast Ratios:** All text and interactive elements will meet WCAG 2.1 AA standards:
    *   Text and images of text: minimum 4.5:1 contrast ratio against background.
    *   Large text (18pt or 14pt bold): minimum 3:1 contrast ratio.
    *   UI components and graphical objects: minimum 3:1 contrast ratio.
*   **Keyboard Navigation:** All interactive elements (buttons, links, form fields, navigation items) will be fully navigable and operable using only the keyboard. Clear focus indicators (e.g., `outline` styles) will be provided.
*   **Semantic HTML:** Proper use of HTML5 semantic elements (e.g., `<nav>`, `<main>`, `<button>`, `<input>`) to ensure screen reader compatibility and logical document structure.
*   **ARIA Attributes:** Appropriate ARIA roles, states, and properties will be used where native HTML semantics are insufficient (e.g., custom components, dynamic content updates).