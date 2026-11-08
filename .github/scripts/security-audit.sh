#!/usr/bin/env bash
# Wrapper that executes the root 12-Gate Security Audit script
exec bash "$(dirname "$0")/../../security-audit.sh" "$@"

