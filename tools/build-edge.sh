#!/bin/sh
# Edge Function-уудыг нэг файл болгож угсарна (Supabase dashboard-д хуулж буулгахад)
cd "$(dirname "$0")/.." || exit 1
build() { # $1 = function name, $2 = shared core file
  OUT=supabase/functions/$1/index.ts
  {
    echo "// ⚠️ АВТОМАТААР ҮҮСГЭСЭН ФАЙЛ — tools/build-edge.sh. Supabase → Edge Functions → $1 руу бүтнээр нь хуулна."
    echo "// deno-lint-ignore-file no-explicit-any"
    sed 's/^export //' "$2"
    cat "supabase/functions/$1/server.part.ts"
  } > "$OUT"
  echo "wrote $OUT"
}
build roster-sync classroom/js/roster-core.js
build weekly-report classroom/js/report-core.js
