#!/usr/bin/env bash
set -e

mkdir -p /var/media/hls
mkdir -p /var/media/dash
chmod 777 /var/media/dash
chmod 777 /var/media/hls

exec "$@"