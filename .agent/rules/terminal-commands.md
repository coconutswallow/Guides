---
trigger: model_decision
description: When running terminal commands
---

# Terminal Commands

## PowerShell HTTP Requests (Supabase / REST APIs)
- **DO NOT** use `curl`. In Windows PowerShell, `curl` is often an alias for `Invoke-WebRequest` which has incompatible syntax with standard curl.
- **DO** use `Invoke-RestMethod` for API calls.
- **Headers**: Define headers as a PowerShell hashtable (`@{ "key" = "value" }`) before calling the command.
- **Example**:
  ```powershell
  $headers = @{ "apikey" = "KEY"; "Authorization" = "Bearer KEY" }
  Invoke-RestMethod -Uri "URL" -Headers $headers
  ```

## Node.js Execution (CLI & Scripts)
- **Supabase / Database Scripts**: When running short-lived Node.js scripts that use `@supabase/supabase-js`, the process may fail to exit cleanly on Windows, throwing: `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`.
- **Mitigation**: 
  - Ensure the script calls `process.exit(0)` explicitly at the end of the async flow.
  - If using `node -e` (eval), wrap the logic in an async block and follow with `process.exit(0)`.
  - **IGNORE** the exit code 1 if the script's primary output (e.g., JSON) was successfully printed before the assertion failure.

## File Paths & Operations
- Always use **Absolute Paths** as required by the system tools.
- When navigating or referencing directories with spaces, use single quotes (e.g., `'Z:\Folder With Spaces'`).

## Directory Operations (PowerShell)
- **DO NOT** use `mkdir -p`. While `mkdir` exists as an alias/function, the `-p` flag is not native to PowerShell and can cause "Item already exists" errors if the folder is present.
- **DO** use `New-Item -ItemType Directory -Path "path" -Force` to ensure a directory exists without throwing an error if it is already there.

## Node.js & ESM Modules
- **ESM Warning**: If running a standalone script with `node script.js` and encountering `MODULE_TYPELESS_PACKAGE_JSON`, it means the file is using `import` but the root `package.json` lacks `"type": "module"`.
- **Mitigation**:
  - Check the nearest `package.json` before creating new scripts.
  - If the project uses ESM, ensure the script is in a directory covered by a `"type": "module"` package.json, or use the `.mjs` extension.
  - Use `npx` to run bin commands (like `vitest`), but ensure dependencies are installed first via `npm install` if a new environment is detected.

## Command Aliases & PowerShell Best Practices
- **DO NOT** use shorthand aliases like `ls`, `rm`, `cat`, or `mv` in production scripts to avoid cross-shell ambiguity. 
- **DO** use full PowerShell cmdlets:
  - Use `Get-ChildItem` instead of `ls` or `dir`.
  - Use `Remove-Item` instead of `rm` or `del`.
  - Use `Move-Item` instead of `mv` or `move`.
  - Use `Get-Content` instead of `cat`.
  - Use `Copy-Item` instead of `cp`.
  - Use `New-Item -ItemType Directory` instead of `mkdir`.
- **Piping**: When piping output to a file (e.g., `> output.txt`), be aware that PowerShell defaults to UTF-16 encoding. If UTF-8 is required, use `| Out-File -Encoding utf8`.

## Monorepo & Windows Symlinks (Local Packages)
- **Windows Restriction**: Creating symbolic links (required by `npm link` or `npm install` for local workspace packages) typically requires **Administrative Privileges** or **Developer Mode** to be enabled on Windows.
- **Failures**: `npm install` may fail with `npm error syscall symlink` or `npm error code UNKNOWN` in monorepos.
- **Mitigation Strategy**:
  - **Browser/Vite Apps**: Do NOT rely solely on `npm install` for internal packages. **DO** use Vite Aliases in `vite.config.js` to map internal packages to their source files.
    ```javascript
    resolve: {
        alias: {
            '@math/logger': path.resolve(__dirname, '../../packages/logger/index.js')
        }
    }
    ```
  - **Node.js Scripts**: Use **Relative Imports** (e.g., `import ... from '../../packages/logger/index.js'`) instead of package names if `npm install` fails to create the workspace link.
  - **Package JSON**: Avoid modifying `package.json` to use `file:` paths as a first resort, as it can cause recursive install loops or path resolution errors on Windows. Aliases and relative paths are more reliable for local development in this environment.
