#!/bin/bash
set -e

php artisan optimize
php artisan migrate --force

if [ "$SERVICE_TYPE" = "reverb" ]; then
  install-php-extensions pcntl 2>/dev/null || true
  echo "extension=pcntl.so" > /usr/local/etc/php/conf.d/docker-php-ext-pcntl.ini 2>/dev/null || true
  php -r "echo 'pcntl='.(extension_loaded('pcntl')?'YES':'NO').' sockets='.(extension_loaded('sockets')?'YES':'NO').' ZTS='.(ZEND_THREAD_SAFE?'YES':'NO').PHP_EOL;"
  php -d extension=pcntl artisan reverb:start --host=0.0.0.0 --port=$PORT 2>&1 || echo "REVERB_CRASHED:$?" >&2
else
  php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
fi
