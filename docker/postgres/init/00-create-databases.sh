#!/bin/bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-'EOSQL'
    SELECT 'CREATE DATABASE pointflex'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pointflex')\gexec
    SELECT 'CREATE DATABASE pointflex_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pointflex_test')\gexec
EOSQL
