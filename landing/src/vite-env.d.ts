/// <reference types="vite/client" />
// Side-effect CSS imports — TypeScript needs an explicit module
// declaration since Vite doesn't ship one for plain `.css` imports
// under the new TS 6 stricter type-only rules.
declare module "*.css";
