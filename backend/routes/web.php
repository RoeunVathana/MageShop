<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'online',
        'application' => config('app.name', 'MegaCommerce Enterprise API'),
        'environment' => config('app.env'),
        'version' => '1.0.0',
        'endpoints' => [
            'health' => '/api/v1/health',
            'catalog' => '/api/v1/catalog',
            'categories' => '/api/v1/categories',
            'brands' => '/api/v1/brands',
        ],
    ]);
});
