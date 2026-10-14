#!/bin/bash
cd "$(dirname "$0")"
f=$1; n=$(basename $f .json); [ "$n" = "hub" ] && exit 0
page=${n%%-*}.html; scheme=light; width=1440
case $n in *dark*) scheme=dark;; esac
case $n in *narrow*) width=390;; esac
out=$(node shoot.js $page $f $scheme $width 2>&1)
errs=$(echo "$out" | sed -n '/^ERRORS/,$p' | grep -v "favicon\|status of 404" | grep -v "^ERRORS")
hs=$(echo "$out" | grep '^HSCROLL')
if [ -z "$errs" ] && [ "$hs" = "HSCROLL: false" ]; then echo "PASS $n ($scheme $width)"; else echo "FAIL $n ($scheme $width) $hs"; echo "$errs" | head -6; fi
