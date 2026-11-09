FROM php:8.2-cli-alpine

RUN apk add --no-cache \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    postgresql-dev \
    libzip-dev \
    argon2-dev \
    $PHPIZE_DEPS

RUN docker-php-ext-install pdo pdo_pgsql bcmath pcntl gd zip opcache && \
    pecl install redis && \
    docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . /app/

RUN if [ -d "/app/backend" ]; then cp -r /app/backend/* /app/ && rm -rf /app/backend /app/frontend; fi

RUN mkdir -p /app/storage/logs /app/storage/framework/cache /app/storage/framework/sessions /app/storage/framework/views /app/bootstrap/cache && \
    chmod -R 777 /app/storage /app/bootstrap/cache

ARG COMPOSER_AUTH=""
ENV COMPOSER_ALLOW_SUPERUSER=1

RUN COMPOSER_MEMORY_LIMIT=-1 composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-progress

ENV PORT=8000
EXPOSE 8000

CMD sh -c "php artisan config:clear && php artisan migrate --force && FORCE_RESEED=true php artisan db:seed --force && php artisan media:sync-cloud && php artisan serve --host=0.0.0.0 --port=${PORT:-8000}"
