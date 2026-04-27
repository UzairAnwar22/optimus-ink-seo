/**
 * Centralized Application Configuration
 *
 * Update values here to apply changes across the entire application.
 * Mirrors optimus.Ink/src/config/appConfig.js so font stacks stay in sync
 * across the SPA and SEO renderers.
 */

const appConfig = {
  fonts: {
    /** Used for h1, h2 headings — Apple SF Pro (system font, no download needed) */
    heading: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", ui-sans-serif, sans-serif',
    /** Used for body text, inputs, buttons — everything else */
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

export default appConfig;
