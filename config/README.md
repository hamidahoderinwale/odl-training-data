# Configuration Files

This directory contains project configuration files that have been organized here for better structure.

## Files

- `.env.example` - Environment variables template
- `.eslintrc.json` - ESLint configuration (symlinked at root for Next.js)
- `tsconfig.json` - TypeScript configuration (symlinked at root for Next.js)
- `.eslintignore` - ESLint ignore patterns
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `.editorconfig` - Editor configuration
- `vercel.json` - Vercel deployment configuration

## Note

Some configuration files must be accessible at the project root due to tool requirements. Symlinks are created from root to these files in `config/`:
- `tsconfig.json` → `config/tsconfig.json` (symlink)
- `.eslintrc.json` → `config/.eslintrc.json` (symlink)

Files that must remain at root (cannot be moved):
- `next.config.js` - Next.js requires this at root
- `tailwind.config.ts` - Tailwind CSS requires this at root
- `postcss.config.js` - PostCSS requires this at root
- `package.json` - npm requires this at root

These tools look for their config files in the root directory by convention.
