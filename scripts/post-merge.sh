#!/bin/bash
set -e

# Install frontend dependencies if package.json changed
cd frontend && npm install --no-audit --no-fund
cd ..

# Ensure Go modules are in sync
cd backend && go mod tidy
