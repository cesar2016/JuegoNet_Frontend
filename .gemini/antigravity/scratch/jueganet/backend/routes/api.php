<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\RaffleController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'check.status'])->group(function () {
    Route::get('/site-admin', [AuthController::class, 'siteAdmin']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/update', [AuthController::class, 'updateProfile']);
    Route::post('/upload-avatar', [AdminController::class, 'uploadAvatar']);

    Route::get('/cart', [OrderController::class, 'cart']);
    Route::post('/cart/add', [OrderController::class, 'addTicket']);
    Route::delete('/cart/remove/{ticket}', [OrderController::class, 'removeTicket']);
    Route::post('/cart/confirm', [OrderController::class, 'confirm']);

    Route::get('/my-orders', [OrderController::class, 'myOrders']);

    Route::get('/raffles', [RaffleController::class, 'index']);
    Route::get('/raffles/finished', [RaffleController::class, 'finished']);
    Route::get('/raffles/active', [RaffleController::class, 'active']);
    Route::get('/raffles/{raffle}', [RaffleController::class, 'show']);
    Route::get('/raffles/{raffle}/board', [RaffleController::class, 'board']);
    Route::get('/raffles/{raffle}/results', [RaffleController::class, 'results']);

    Route::middleware('admin')->group(function () {
        Route::post('/raffles', [RaffleController::class, 'store']);
        Route::put('/raffles/{raffle}', [RaffleController::class, 'update']);
        Route::delete('/raffles/{raffle}', [RaffleController::class, 'destroy']);

        Route::get('/admin/pending-users', [AdminController::class, 'pendingUsers']);
        Route::get('/admin/pending-orders', [AdminController::class, 'pendingOrders']);
        Route::post('/admin/users/{user}/approve', [AdminController::class, 'approveUser']);
        Route::post('/admin/users/{user}/reject', [AdminController::class, 'rejectUser']);

        Route::post('/admin/orders/{order}/approve', [AdminController::class, 'approveOrder']);
        Route::post('/admin/orders/{order}/reject', [AdminController::class, 'rejectOrder']);
        Route::get('/admin/orders', [AdminController::class, 'allOrders']);

        Route::get('/admin/users', [AdminController::class, 'listUsers']);
        Route::put('/admin/users/{user}', [AdminController::class, 'updateUser']);
        Route::post('/admin/users/{user}/block', [AdminController::class, 'blockUser']);
        Route::post('/admin/users/{user}/unblock', [AdminController::class, 'unblockUser']);
        Route::post('/admin/upload-avatar', [AdminController::class, 'uploadAvatar']);

        Route::get('/admin/stats', [AdminController::class, 'stats']);
        Route::get('/admin/admin-stats', [AdminController::class, 'adminStats']);

        Route::get('/admin/invite/latest', [AdminController::class, 'latestInvite']);
        Route::post('/admin/invite', [AdminController::class, 'generateInvite']);

        Route::get('/admin/raffles', [RaffleController::class, 'all']);
        Route::get('/admin/raffles/{raffle}/participants', [RaffleController::class, 'participants']);
        Route::post('/admin/raffles/{raffle}/results', [RaffleController::class, 'setResults']);
        Route::post('/admin/raffles/{raffle}/activate', [RaffleController::class, 'toggleActive']);

        Route::middleware('super.admin')->group(function () {
            Route::post('/admin/create-admin', [AdminController::class, 'createAdmin']);
        });
    });
});
