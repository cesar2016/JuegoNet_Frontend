<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BetController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DrawController;
use App\Http\Controllers\Api\ExtractController;
use App\Http\Controllers\Api\LotteryController;
use App\Http\Controllers\Api\ScrutinyController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\AciertoController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/lotteries', [LotteryController::class, 'index']);
    Route::get('/lotteries/{lottery}', [LotteryController::class, 'show']);
    Route::get('/draws', [DrawController::class, 'index']);

    Route::get('/bets', [BetController::class, 'index']);
    Route::post('/bets', [BetController::class, 'store']);
    Route::get('/bets/{bet}', [BetController::class, 'show']);
    Route::delete('/bets/{bet}', [BetController::class, 'destroy']);

    Route::get('/tickets/{bet}/download', [TicketController::class, 'download']);
    Route::get('/tickets/{bet}/reprint', [TicketController::class, 'reprint']);

    Route::middleware('role:admin|super_admin')->group(function () {
        Route::get('/extracts', [ExtractController::class, 'index']);
        Route::post('/extracts', [ExtractController::class, 'store']);
        Route::get('/extracts/{extract}', [ExtractController::class, 'show']);

        Route::post('/scrutiny/{extract}', [ScrutinyController::class, 'run']);

        Route::get('/aciertos', [AciertoController::class, 'index']);

        Route::get('/dashboard/cash-register', [DashboardController::class, 'cashRegister']);
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    });
});
