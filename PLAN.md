# TabsCopy 严格代码质量检查实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 TabsCopy 增加提交、合并、发布前会失败拦截的严格代码质量门禁。

**Architecture:** 先补本地脚本和 TypeScript 严格配置，再加 lint/format/deadcode/security/coverage，最后用 CI 统一执行同一组命令。保持小项目简单，不引入 Plankton 全量 hook 系统；如后续需要写时自动修复，再单独接 Plankton。

**Tech Stack:** WXT、TypeScript、Vitest、ESLint type-aware、Biome、Knip、Gitleaks、Semgrep、GitHub Actions。

---

## 文件结构

- Modify: `package.json` — 增加质量检查脚本和 devDependencies。
- Modify: `tsconfig.json` — 开启比 `strict` 更严格的 TypeScript 检查。
- Create: `eslint.config.mjs` — TypeScript type-aware lint，warning 视为失败。
- Create: `biome.json` — 格式检查配置。
- Create: `knip.json` — 未用文件、导出、依赖检查，适配 WXT entrypoints。
- Modify: `vitest.config.ts` — 开启 coverage 阈值。
- Create: `.github/workflows/quality.yml` — CI 门禁。
- Optional Create: `.gitleaks.toml` — 如默认规则误报，再加 allowlist。

---

## 推荐落地顺序

### Task 1: TypeScript 严格检查

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: 安装 TypeScript 检查无需新增包**

当前已有 `typescript`。只需要加脚本。

- [ ] **Step 2: 修改 `package.json` scripts**

加入：

```json
{
    "scripts": {
        "typecheck": "tsc --noEmit --pretty false"
    }
}
```

保留现有 `dev/build/test` 脚本，只新增，不删除。

- [ ] **Step 3: 修改 `tsconfig.json`**

在 `compilerOptions` 中加：

```json
{
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true
}
```

- [ ] **Step 4: 验证**

Run:

```bash
npm run typecheck
```

Expected: 通过；如失败，修代码，不放宽配置。

---

### Task 2: ESLint type-aware lint

**Files:**
- Modify: `package.json`
- Create: `eslint.config.mjs`

- [ ] **Step 1: 安装依赖**

Run:

```bash
npm install -D eslint typescript-eslint @eslint/js globals
```

- [ ] **Step 2: 修改 `package.json` scripts**

加入：

```json
{
    "scripts": {
        "lint": "eslint . --max-warnings=0"
    }
}
```

- [ ] **Step 3: 创建 `eslint.config.mjs`**

```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['.output/**', '.wxt/**', 'node_modules/**', 'coverage/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.browser,
                ...globals.webextensions,
            },
        },
        rules: {
            'no-console': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',
        },
    },
);
```

- [ ] **Step 4: 验证**

Run:

```bash
npm run lint
```

Expected: 通过；如失败，修源码，不关规则。

---

### Task 3: Biome 格式检查

**Files:**
- Modify: `package.json`
- Create: `biome.json`

- [ ] **Step 1: 安装依赖**

Run:

```bash
npm install -D @biomejs/biome
```

- [ ] **Step 2: 修改 `package.json` scripts**

加入：

```json
{
    "scripts": {
        "format": "biome format --write .",
        "format:check": "biome format --check ."
    }
}
```

- [ ] **Step 3: 创建 `biome.json`**

```json
{
    "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
    "files": {
        "includes": [
            "**",
            "!.output/**",
            "!.wxt/**",
            "!node_modules/**",
            "!coverage/**",
            "!package-lock.json"
        ]
    },
    "formatter": {
        "enabled": true,
        "indentStyle": "space",
        "indentWidth": 4,
        "lineWidth": 100
    },
    "javascript": {
        "formatter": {
            "quoteStyle": "single",
            "semicolons": "always",
            "trailingCommas": "all"
        }
    },
    "json": {
        "formatter": {
            "trailingCommas": "none"
        }
    }
}
```

- [ ] **Step 4: 先自动格式化**

Run:

```bash
npm run format
```

Expected: 格式化完成。

- [ ] **Step 5: 验证**

Run:

```bash
npm run format:check
```

Expected: 通过。

---

### Task 4: Knip 死代码和依赖检查

**Files:**
- Modify: `package.json`
- Create: `knip.json`

- [ ] **Step 1: 安装依赖**

Run:

```bash
npm install -D knip
```

- [ ] **Step 2: 修改 `package.json` scripts**

加入：

```json
{
    "scripts": {
        "deadcode": "knip"
    }
}
```

- [ ] **Step 3: 创建 `knip.json`**

```json
{
    "$schema": "https://unpkg.com/knip@latest/schema.json",
    "entry": [
        "wxt.config.ts",
        "entrypoints/**/*.ts",
        "tests/**/*.ts",
        "public/**/*.js"
    ],
    "project": [
        "lib/**/*.ts",
        "entrypoints/**/*.ts",
        "tests/**/*.ts",
        "public/**/*.js",
        "*.ts"
    ],
    "ignore": [
        ".output/**",
        ".wxt/**"
    ],
    "ignoreDependencies": [
        "wxt"
    ]
}
```

- [ ] **Step 4: 验证**

Run:

```bash
npm run deadcode
```

Expected: 通过；如 WXT 约定入口误报，只在 `knip.json` 精准 ignore，不删除真实入口。

---

### Task 5: Vitest coverage 门禁

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: 安装 coverage provider**

Run:

```bash
npm install -D @vitest/coverage-v8
```

- [ ] **Step 2: 修改 `package.json` scripts**

加入：

```json
{
    "scripts": {
        "test:coverage": "vitest run --coverage"
    }
}
```

- [ ] **Step 3: 修改 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80,
            },
        },
    },
});
```

- [ ] **Step 4: 验证**

Run:

```bash
npm run test:coverage
```

Expected: 通过；如低于 80%，补测试，不降阈值。

---

### Task 6: 安全检查

**Files:**
- Modify: `package.json`
- Optional Create: `.gitleaks.toml`

- [ ] **Step 1: 增加 npm audit 脚本**

在 `package.json` scripts 加：

```json
{
    "scripts": {
        "deps:check": "npm audit --audit-level=high",
        "security": "npm run deps:check && gitleaks detect --no-banner --redact && semgrep --config p/javascript --config p/typescript --error"
    }
}
```

- [ ] **Step 2: 安装或确认本机有工具**

需要：

```bash
gitleaks version
semgrep --version
```

如缺失，按官方方式安装到系统或项目 CI 环境。不要把二进制提交进仓库。

- [ ] **Step 3: 验证依赖漏洞**

Run:

```bash
npm run deps:check
```

Expected: high 以上漏洞为 0。

- [ ] **Step 4: 验证安全扫描**

Run:

```bash
npm run security
```

Expected: 通过；如误报，再创建 `.gitleaks.toml` 做最小 allowlist。

---

### Task 7: 统一质量门禁脚本

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 增加总检查脚本**

在 `package.json` scripts 加：

```json
{
    "scripts": {
        "quality": "npm run typecheck && npm run lint && npm run format:check && npm run deadcode && npm run test:coverage && npm run security && npm run build"
    }
}
```

- [ ] **Step 2: 验证**

Run:

```bash
npm run quality
```

Expected: 全部通过。

---

### Task 8: GitHub Actions CI 门禁

**Files:**
- Create: `.github/workflows/quality.yml`

- [ ] **Step 1: 创建 workflow**

```yaml
name: quality

on:
  pull_request:
  push:
    branches:
      - master

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install security tools
        run: |
          python -m pip install --upgrade pip
          python -m pip install semgrep
          curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/install.sh | sh -s -- -b "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"

      - name: Run quality gate
        run: npm run quality
```

- [ ] **Step 2: 本地验证 YAML 存在**

Run:

```bash
test -f .github/workflows/quality.yml
```

Expected: exit code 0。

---

## 最终验收

Run:

```bash
npm run quality
```

Expected: 通过。

Run:

```bash
npm run build
```

Expected: 生成 `.output/chrome-mv3/`。

检查：

```bash
git diff -- package.json package-lock.json tsconfig.json vitest.config.ts eslint.config.mjs biome.json knip.json .github/workflows/quality.yml
```

Expected: 只包含质量门禁相关改动，没有业务逻辑改动。
