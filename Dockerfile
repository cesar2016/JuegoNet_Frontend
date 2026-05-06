FROM php:8.3-apache
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libmysqlclient-dev \
    && docker-php-ext-install pdo_mysql gd \
    && apt-get clean

COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html
COPY . .
RUN composer install --no-dev --optimize-autoloader

RUN chown -R www-data:www-data /var/www/html \
    && php artisan storage:link || true

EXPOSE 80
CMD ["apache2-foreground"]
