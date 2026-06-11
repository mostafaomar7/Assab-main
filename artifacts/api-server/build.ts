import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile, cp, mkdir } from "fs/promises";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  // ── 1. Build the ASAB frontend (mockup-sandbox) ──────────────────────────
  console.log("building ASAB frontend...");
  const workspaceRoot = path.resolve(__dirname, "../..");
  // Pass env vars via the options object (not an inline `VAR=x cmd` prefix) so
  // this works on Windows cmd.exe as well as POSIX shells.
  execSync(
    "pnpm --filter @workspace/mockup-sandbox run build",
    {
      cwd: workspaceRoot,
      stdio: "inherit",
      env: { ...process.env, BASE_PATH: "/", PORT: "3000", NODE_ENV: "production" },
    }
  );

  // ── 2. Copy frontend dist → server dist/public ───────────────────────────
  console.log("copying frontend assets to server dist/public...");
  const frontendDist = path.resolve(workspaceRoot, "artifacts/mockup-sandbox/dist");
  const publicDir = path.resolve(distDir, "public");
  await mkdir(publicDir, { recursive: true });
  await cp(frontendDist, publicDir, { recursive: true });

  // ── 3. Build the Express server ──────────────────────────────────────────
  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "index.cjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("✓ build complete — server + ASAB frontend bundled");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
