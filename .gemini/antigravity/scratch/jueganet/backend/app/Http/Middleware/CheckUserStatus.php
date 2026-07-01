<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserStatus
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->status !== 'approved') {
            $msg = $user->status === 'blocked'
                ? 'Tu cuenta ha sido bloqueada.'
                : 'Tu cuenta no está aprobada.';

            return response()->json([
                'message' => $msg,
                'status' => $user->status,
            ], 403);
        }

        return $next($request);
    }
}
