#!/usr/bin/env bash
# MegaCommerce self-healing watchdog.
# Runs on GitHub's servers (works while your computer is off).
#
# Escalation ladder per service:
#   1. Probe health (3 attempts, 20s apart) to avoid false alarms.
#   2. Restart: redeploy the current image.
#   3. Rollback: if still down, redeploy the last previously-healthy commit.
#   4. AI diagnosis: send recent logs to Gemini and open/update a GitHub issue.
set -uo pipefail

: "${RAILWAY_TOKEN:?RAILWAY_TOKEN secret is required}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-flash-latest}"
REPORT_FILE="${REPORT_FILE:-heal-report.md}"
: > "$REPORT_FILE"

# name|railway-service|health-url|expected-body-substring
SERVICES=(
  "Backend API|MageShop|https://mageshop-production.up.railway.app/api/v1/health/ready|"
  "Storefront|frontend|https://frontend-production-97470.up.railway.app/|"
)

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
report() { echo "$*" >> "$REPORT_FILE"; }

probe_once() {
  local url="$1" expect="$2" code body
  body=$(curl -s --max-time 15 -w $'\n%{http_code}' "$url" || printf '\n000')
  code="${body##*$'\n'}"
  body="${body%$'\n'*}"
  [[ "$code" =~ ^2 ]] || return 1
  [[ -z "$expect" || "$body" == *"$expect"* ]] || return 1
  return 0
}

probe() {
  local url="$1" expect="$2" i
  for i in 1 2 3; do
    probe_once "$url" "$expect" && return 0
    log "  probe $i/3 failed for $url"
    [[ $i -lt 3 ]] && sleep 20
  done
  return 1
}

wait_healthy() {
  # Poll up to ~6 minutes for a redeploy to come up.
  local url="$1" expect="$2" i
  for i in $(seq 1 24); do
    sleep 15
    probe_once "$url" "$expect" && return 0
  done
  return 1
}

last_good_commit() {
  # Most recent deployment that ran successfully but is not the current one.
  railway deployment list --service "$1" --json 2>/dev/null | jq -r '
    (.[0].meta.commitHash) as $cur
    | [ .[] | select((.status=="SUCCESS" or .status=="REMOVED") and .meta.commitHash != $cur) ]
    | first | .meta.commitHash // empty'
}

ai_diagnose() {
  local name="$1" svc="$2" logs prompt payload answer
  logs=$(railway logs --service "$svc" --lines 150 2>&1 | tail -c 12000)
  logs+=$'\n--- latest build/deploy logs ---\n'
  logs+=$(railway logs --service "$svc" --latest --lines 80 2>&1 | tail -c 6000)

  if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    report "<details><summary>Recent logs ($svc)</summary>"$'\n\n```\n'"$(echo "$logs" | tail -c 6000)"$'\n```\n</details>'
    report "_Set the GEMINI_API_KEY secret to get an AI root-cause analysis._"
    return
  fi

  prompt="You are an SRE for a Laravel 11 (PHP 8.2, PostgreSQL via PgBouncer, Redis) API and a React/Vite storefront hosted on Railway.
The service \"$name\" (Railway service: $svc) failed its health check and automatic restart/rollback did not fully resolve it.
Analyse these logs. Reply in Markdown with: 1) Root cause (most likely), 2) Evidence (quote log lines), 3) Exact fix (file + code change or Railway setting/command), 4) Whether it is safe to auto-apply. Be concise.

LOGS:
$logs"

  payload=$(jq -n --arg p "$prompt" '{contents:[{parts:[{text:$p}]}]}')
  answer=$(curl -s --max-time 90 \
    -H "Content-Type: application/json" \
    -H "x-goog-api-key: ${GEMINI_API_KEY}" \
    -d "$payload" \
    "https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent" \
    | jq -r '.candidates[0].content.parts[0].text // ("AI error: " + (.error.message // "no response"))')

  report "### 🤖 AI diagnosis — $name"
  report "$answer"
}

OVERALL_OK=true
INCIDENT=false

for entry in "${SERVICES[@]}"; do
  IFS='|' read -r NAME SVC URL EXPECT <<< "$entry"
  log "Checking $NAME ($URL)"

  if probe "$URL" "$EXPECT"; then
    log "  ✅ healthy"
    continue
  fi

  INCIDENT=true
  report "## 🚨 $NAME was DOWN"
  report "- Health URL: \`$URL\`"
  report "- Detected: $(date -u '+%Y-%m-%d %H:%M UTC')"

  # Step 2: restart
  log "  ♻️  restarting $SVC"
  railway redeploy --service "$SVC" -y >/dev/null 2>&1 \
    && report "- Step 1: restart (redeploy current image) triggered" \
    || report "- Step 1: restart FAILED to trigger"

  if wait_healthy "$URL" "$EXPECT"; then
    log "  ✅ recovered after restart"
    report "- ✅ **Recovered after restart**"
    continue
  fi

  # Step 3: rollback to last good commit
  GOOD=$(last_good_commit "$SVC")
  if [[ -n "$GOOD" ]]; then
    log "  ⏪ rolling back $SVC to $GOOD"
    railway redeploy --service "$SVC" --commit "$GOOD" -y >/dev/null 2>&1 \
      && report "- Step 2: rollback to last healthy commit \`${GOOD:0:7}\` triggered" \
      || report "- Step 2: rollback FAILED to trigger"
    if wait_healthy "$URL" "$EXPECT"; then
      log "  ✅ recovered after rollback"
      report "- ✅ **Recovered after rollback.** The newest commit is probably broken — fix it before pushing again."
      ai_diagnose "$NAME" "$SVC"
      continue
    fi
  else
    report "- Step 2: no previous healthy commit found for rollback"
  fi

  OVERALL_OK=false
  report "- ❌ **Still down after restart and rollback — needs human attention**"
  ai_diagnose "$NAME" "$SVC"
done

echo "incident=$INCIDENT" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "healthy=$OVERALL_OK" >> "${GITHUB_OUTPUT:-/dev/null}"
$OVERALL_OK
