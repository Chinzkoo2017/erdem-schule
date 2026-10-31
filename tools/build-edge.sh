#!/bin/sh
# roster-core.js + server.part.ts → supabase/functions/roster-sync/index.ts
cd "$(dirname "$0")/.." || exit 1
OUT=supabase/functions/roster-sync/index.ts
{
  echo "// ⚠️ АВТОМАТААР ҮҮСГЭСЭН ФАЙЛ — tools/build-edge.sh. Supabase → Edge Functions → roster-sync руу бүтнээр нь хуулна."
  echo "// deno-lint-ignore-file no-explicit-any"
  sed 's/^export //' classroom/js/roster-core.js
  cat supabase/functions/roster-sync/server.part.ts
} > "$OUT"
echo "wrote $OUT"
