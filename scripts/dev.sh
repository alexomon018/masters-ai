#!/usr/bin/env bash
set -euo pipefail

yarn worker:dev &
worker_pid=$!

cleanup() {
	kill "$worker_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for worker on http://localhost:8787..."
until bash -c "echo >/dev/tcp/127.0.0.1/8787" 2>/dev/null; do
	sleep 0.25
done

yarn dev
