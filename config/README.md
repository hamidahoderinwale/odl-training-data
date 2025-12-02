# Configuration Files

This directory contains project configuration files that have been organized here for better structure.

## Files

- `.env.example` - Environment variables template
- `.eslintrc.json` - ESLint configuration
- `.eslintignore` - ESLint ignore patterns
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `.editorconfig` - Editor configuration
- `vercel.json` - Vercel deployment configuration

## Note

Some configuration files must remain at the project root due to tool requirements:
- `next.config.js` - Next.js requires this at root
- `tsconfig.json` - TypeScript requires this at root
- `tailwind.config.ts` - Tailwind CSS requires this at root
- `postcss.config.js` - PostCSS requires this at root
- `package.json` - npm requires this at root

These tools look for their config files in the root directory by convention.
