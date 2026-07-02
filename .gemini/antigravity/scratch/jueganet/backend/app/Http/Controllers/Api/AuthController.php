<?php

namespace App\Http\Controllers\Api;

use App\Events\AdminNotification;
use App\Http\Controllers\Controller;
use App\Models\AdminInvite;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'status' => 'pending_approval',
            'role' => $isFromSuper ? 'admin' : 'user',
            'admin_id' => $adminId,
        ]);

        if ($adminId) {
            $this->broadcastToAdminAndSuperAdmins($adminId, $isFromSuper ? 'admin_users_updated' : 'pending_users_updated');
        }

        $message = $isFromSuper
            ? 'Registro exitoso como administrador. Espera la aprobación.'
            : 'Registro exitoso. Espera la aprobación del administrador.';

        return response()->json([
            'message' => $message,
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

        if ($user->status !== 'approved') {
            $msg = $user->status === 'blocked'
                ? 'Tu cuenta ha sido bloqueada. Contactá al administrador.'
                : 'Tu cuenta está pendiente de aprobación.';

            return response()->json([
                'message' => $msg,
                'status' => $user->status,
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Inicio de sesión exitoso.',
            'user' => $user,
            'token' => $token,
        ]);
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
