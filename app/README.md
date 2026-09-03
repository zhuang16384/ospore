# ospore

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ pnpm install
```

### Development

```bash
$ pnpm dev
```

### Build

```bash
# For windows
$ pnpm build:win

# For macOS
$ pnpm build:mac

# For Linux
$ pnpm build:linux
```

## Configuration Files

The project uses several configuration files to manage building, linting, formatting, and environment settings:

- **`.editorconfig`**: Ensures consistent coding styles (like indentation and line endings) across different editors and IDEs.
- **`.npmrc`**: Configures npm/pnpm behavior, such as registry settings and dependency management.
- **`.prettierrc.yaml` & `.prettierignore`**: Configures Prettier for automated code formatting and specifies files to exclude from formatting.
- **`electron-builder.yml`**: Defines how the application is packaged and distributed for Windows, macOS, and Linux (e.g., app ID, product name, artifacts).
- **`electron.vite.config.ts`**: The main configuration for [electron-vite](https://electron-vite.org/), handling the build process for the Main, Preload, and Renderer processes.
- **`eslint.config.mjs`**: Contains ESLint rules and settings to maintain code quality and consistency across the codebase.
- **`package.json`**: The heart of the project, containing metadata (version, name), scripts for development and building, and all project dependencies.
- **`pnpm-lock.yaml`**: Ensures deterministic installations by locking the exact versions of all dependencies.
- **`tsconfig.json`**, **`tsconfig.node.json`**, & **`tsconfig.web.json`**: TypeScript configurations that define how the code is transpiled for different environments (Node.js for Main/Preload processes and Web for the Renderer process).
