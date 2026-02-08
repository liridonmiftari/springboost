#!/usr/bin/env bash

# Local development database configuration for Spring-Boilerplate-Buster
# Usage:
#   source ./env.local.sh
#   npm run dev

export DATABASE_URL="postgres://app:app@localhost:5432/spring_bbb"

echo "DATABASE_URL set for local development."

