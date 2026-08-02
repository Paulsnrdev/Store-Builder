import fs from "node:fs";
import path from "node:path";

// Prisma's own runtime engine-search logic checks a mix of paths, some of which are
// absolute build-time paths (e.g. /vercel/path0/...) baked in when `prisma generate` ran
// on Vercel's build machine — those don't exist in the actual Lambda runtime, so the
// search fails there even though the engine file genuinely shipped (confirmed via a
// filesystem probe: it's really at <cwd>/src/generated/prisma/libquery_engine-rhel-
// openssl-3.0.x.so.node). Pointing Prisma at the real on-disk path directly sidesteps
// that broken search entirely. Guarded by existence check so local dev (Windows engine,
// no rhel binary present) is unaffected. Must be imported before "@/generated/prisma/client"
// so this runs first — see src/lib/prisma.ts.
// binaryTargets generates both engines everywhere (including on Windows dev machines),
// so this must also check the platform — file existence alone isn't enough to tell
// "deployed on Linux" apart from "developing on Windows with both engines on disk".
const rhelEngine = path.join(process.cwd(), "src/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node");
if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY && process.platform === "linux" && fs.existsSync(rhelEngine)) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = rhelEngine;
}
