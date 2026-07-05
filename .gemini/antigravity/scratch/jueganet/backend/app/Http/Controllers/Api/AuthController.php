<?php

namespace App\Http\Controllers\Api;

use App\Events\AdminNotification;
use App\Http\Controllers\Controller;
use App\Mail\VerificationEmail;
use App\Models\AdminInvite;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'invite_token' => 'nullable|string|exists:admin_invites,token',
        ]);

        $adminId = null;

        if ($inviteToken = $validated['invite_token'] ?? null) {
            $invite = AdminInvite::where('token', $inviteToken)->first();

            if (! $invite || ! $invite->isValid()) {
                return response()->json(['message' => 'El enlace de invitación no es válido o expiró.'], 400);
            }

            $invitingAdmin = $invite->admin;
            $isSuper = $invitingAdmin && $invitingAdmin->isSuperAdmin();

            if (! $isSuper && User::where('admin_id', $invite->admin_id)->count() >= 100) {
                return response()->json(['message' => 'El administrador alcanzó el límite de 100 usuarios.'], 422);
            }

            $adminId = $invite->admin_id;
        }

        $isFromSuper = isset($isSuper) && $isSuper;
        $verificationToken = Str::random(64);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'status' => 'pending_verification',
            'role' => $isFromSuper ? 'admin' : 'user',
            'admin_id' => $adminId,
            'verification_token' => $verificationToken,
        ]);

        $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:3333');
        $verificationUrl = rtrim($frontendUrl, '/').'/verify-email/'.$verificationToken;

        try {
            Mail::to($user->email)->send(new VerificationEmail($user, $verificationUrl));
        } catch (\Throwable $e) {
            // Log error, user can resend later
        }

        if ($adminId) {
            $this->broadcastToAdminAndSuperAdmins($adminId, 'admin_users_updated');
        }

        return response()->json([
            'message' => 'Registro exitoso. Revisá tu email para verificar tu cuenta.',
            'user' => $user,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        if ($user->status === 'blocked') {
            return response()->json([
                'message' => 'Tu cuenta ha sido bloqueada. Contactá al administrador.',
                'status' => 'blocked',
            ], 403);
        }

        if (! $user->email_verified_at) {
            return response()->json([
                'message' => 'Debés verificar tu email antes de iniciar sesión. Revisá tu bandeja de entrada.',
                'status' => 'pending_verification',
            ], 403);
        }

        if ($user->status !== 'approved') {
            $user->update(['status' => 'approved']);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Inicio de sesión exitoso.',
            'user' => $user->fresh(),
            'token' => $token,
        ]);
    }

    public function verifyEmail(string $token): JsonResponse
    {
        $user = User::where('verification_token', $token)->first();

        if (! $user) {
            return response()->json(['message' => 'El enlace de verificación no es válido o ya fue usado.'], 400);
        }

        $user->update([
            'email_verified_at' => now(),
            'status' => 'approved',
            'verification_token' => null,
        ]);

        return response()->json([
            'message' => 'Email verificado exitosamente. Ya podés iniciar sesión.',
        ]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => 'required|string|email']);

        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json(['message' => 'No hay una cuenta con ese email.'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Tu email ya está verificado. Iniciá sesión.'], 400);
        }

        $token = $user->verification_token ?? Str::random(64);
        if (! $user->verification_token) {
            $user->update(['verification_token' => $token]);
        }

        $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:3333');
        $verificationUrl = rtrim($frontendUrl, '/').'/verify-email/'.$token;

        try {
            Mail::to($user->email)->send(new VerificationEmail($user, $verificationUrl));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al enviar el email. Intentá de nuevo.'], 500);
        }

        return response()->json(['message' => 'Email de verificación reenviado. Revisá tu bandeja de entrada.']);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function siteAdmin(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            if ($user->isAdmin()) {
                return response()->json([
                    'name' => $user->name,
                    'avatar' => $user->avatar,
                ]);
            }

            $admin = $user->admin;

            if ($admin) {
                return response()->json([
                    'name' => $admin->name,
                    'avatar' => $admin->avatar,
                ]);
            }
        }

        $superAdmin = User::where('role', 'super_admin')->first();

        if (! $superAdmin) {
            return response()->json(['message' => 'No hay administrador.'], 404);
        }

        return response()->json([
            'name' => $superAdmin->name,
            'avatar' => $superAdmin->avatar,
        ]);
    }

    public function testMail(Request $request): JsonResponse
    {
        $to = $request->input('email', $request->user()->email);
        $user = $request->user();

        try {
            $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:3333');
            $url = rtrim($frontendUrl, '/').'/verify-email/test';
            Mail::to($to)->send(new VerificationEmail($user, $url));

            return response()->json(['message' => 'Email enviado a '.$to]);
        } catch (\Throwable $e) {
            $details = [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ];
            if (method_exists($e, 'getDebug')) {
                $details['debug'] = $e->getDebug();
            }

            return response()->json(['error' => $details], 500);
        }
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,'.$user->id,
            'whatsapp' => 'nullable|string|max:20',
            'avatar' => 'nullable|string|max:255',
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Perfil actualizado.',
            'user' => $user->fresh(),
        ]);
    }
}
