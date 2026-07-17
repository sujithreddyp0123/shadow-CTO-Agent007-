import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["scripts/run-shadow-cto.mjs"], {
  env: {
    ...process.env,
    SHADOW_CTO_REQUIRE_AGENT: "1",
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
