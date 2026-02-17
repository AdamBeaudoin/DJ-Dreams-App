#!/bin/sh
set -eu

git config core.hooksPath .githooks

echo "Local git hooks enabled (.githooks)."
echo "Direct pushes to main are now blocked in this clone."
