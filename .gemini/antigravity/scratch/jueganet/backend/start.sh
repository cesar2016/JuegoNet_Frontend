#!/bin/bash
set -e

php artisan optimize
php artisan migrate --force

if [ "$SERVICE_TYPE" = "reverb" ]; then
  php artisan reverb:start --host=0.0.0.0 --port=$PORT 2>&1 || echo "REVERB_CRASHED:$?" >&2
else
  php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
fi
