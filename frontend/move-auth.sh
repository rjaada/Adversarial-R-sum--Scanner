#!/usr/bin/env bash
set -e
BASE=~/projects/me/Resume/frontend/app

mkdir -p "$BASE/(auth)/workspace"
mkdir -p "$BASE/(auth)/account/billing"
mkdir -p "$BASE/(auth)/account/data"
mkdir -p "$BASE/(auth)/sign-in/[[...sign-in]]"
mkdir -p "$BASE/(auth)/sign-up/[[...sign-up]]"

mv "$BASE/workspace/page.tsx"               "$BASE/(auth)/workspace/page.tsx"
mv "$BASE/account/page.tsx"                 "$BASE/(auth)/account/page.tsx"
mv "$BASE/account/layout.tsx"               "$BASE/(auth)/account/layout.tsx"
mv "$BASE/account/AccountLayoutShell.tsx"   "$BASE/(auth)/account/AccountLayoutShell.tsx"
mv "$BASE/account/billing/page.tsx"         "$BASE/(auth)/account/billing/page.tsx"
mv "$BASE/account/data/page.tsx"            "$BASE/(auth)/account/data/page.tsx"
mv "$BASE/sign-in/[[...sign-in]]/page.tsx"  "$BASE/(auth)/sign-in/[[...sign-in]]/page.tsx"
mv "$BASE/sign-up/[[...sign-up]]/page.tsx"  "$BASE/(auth)/sign-up/[[...sign-up]]/page.tsx"

rmdir "$BASE/workspace"
rmdir "$BASE/account/billing"
rmdir "$BASE/account/data"
rmdir "$BASE/account"
rmdir "$BASE/sign-in/[[...sign-in]]"
rmdir "$BASE/sign-in"
rmdir "$BASE/sign-up/[[...sign-up]]"
rmdir "$BASE/sign-up"

echo "Done"
