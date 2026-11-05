# Decides prove.sh's exit code from what the runner actually produced.

# verdict_code <runner exit code> <report.md> <report.json> prints 0, 1 or 2.
# A 0 or 1 counts only with a complete report that says the same thing. Anything else has no verdict.
verdict_code() {
  local code="$1" md="$2" json="$3" results
  case "$code" in
    0|1) ;;
    *) echo 2; return 0 ;;
  esac
  if [ ! -s "$md" ] || [ ! -s "$json" ] || ! grep -q "\"exitCode\":$code," "$json"; then
    echo 2
    return 0
  fi
  results="$(grep -o '"id":"' "$json" | wc -l | tr -d ' ')"
  if [ "$results" != 15 ]; then
    echo 2
    return 0
  fi
  echo "$code"
}

# verdict_names_breach <check id> <report.md> succeeds if the report marks that check as breached.
verdict_names_breach() {
  grep -Eq "^\| $1 \|.*\| BREACHED \|" "$2"
}
