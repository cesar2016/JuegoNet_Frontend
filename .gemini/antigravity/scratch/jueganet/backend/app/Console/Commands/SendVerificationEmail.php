<?php

namespace App\Console\Commands;

use App\Mail\VerificationEmail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendVerificationEmail extends Command
{
    protected $signature = 'mail:send-verification {userId} {token}';
    protected $description = 'Send verification email to a user';

    public function handle(): int
    {
        $userId = $this->argument('userId');
        $token = $this->argument('token');

        $user = User::find($userId);
        if (! $user) {
            $this->error("User {$userId} not found");
            return 1;
        }

        $frontendUrl = env('FRONTEND_URL', 'http://127.0.0.1:3333');
        $verificationUrl = rtrim($frontendUrl, '/').'/verify-email/'.$token;

        try {
            Mail::to($user->email)->send(new VerificationEmail($user, $verificationUrl));
            $this->info("Verification email sent to {$user->email}");
        } catch (\Throwable $e) {
            $this->error("Failed: {$e->getMessage()}");
            return 1;
        }

        return 0;
    }
}
