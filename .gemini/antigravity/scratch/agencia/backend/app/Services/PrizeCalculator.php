<?php

namespace App\Services;

use App\Enums\BetType;

class PrizeCalculator
{
    private array $multipliers = [
        1 => [1 => 7, 2 => 70, 3 => 500, 4 => 3500],
        2 => [1 => 7, 2 => 70, 3 => 600, 4 => 3000],
    ];

    public function calculatePrimera(string $number, float $amount, array $extractNumbers, int $config = 1): array
    {
        $digits = strlen($number);
        $multiplier = $this->multipliers[$config][$digits] ?? 0;

        $pos1 = collect($extractNumbers)->firstWhere('position', 1);
        if (!$pos1) {
            return ['prize' => 0, 'position' => null];
        }

        $extractFull = $pos1['number'];
        if (substr($extractFull, -$digits) === $number) {
            return ['prize' => $amount * $multiplier, 'position' => 1];
        }

        return ['prize' => 0, 'position' => null];
    }

    public function calculatePremio(string $number, float $amount, BetType $type, array $extractNumbers, int $config = 1): array
    {
        $range = $type->range();
        $digits = strlen($number);
        $baseMultiplier = $this->multipliers[$config][$digits] ?? 0;

        $matches = [];
        foreach ($extractNumbers as $pos) {
            if ($pos['position'] > $range) {
                continue;
            }
            if (substr($pos['number'], -$digits) === $number) {
                $matches[] = $pos['position'];
            }
        }

        if (empty($matches)) {
            return ['prize' => 0, 'position' => null];
        }

        $prize = ($baseMultiplier / $range) * count($matches) * $amount;

        return ['prize' => $prize, 'position' => $matches[0]];
    }

    private array $redoblonaMultipliers = [
        1 => [5 => 1280, 10 => 640, 20 => 336.84],
        5 => [5 => 256, 10 => 128, 20 => 64],
        10 => [10 => 64, 20 => 32],
        20 => [20 => 16],
    ];

    public function calculateRedoblona(
        float $amount,
        int $firstRange,
        int $secondRange,
        string $firstNumber,
        string $secondNumber,
        array $extractNumbers
    ): float {
        $firstDigits = strlen($firstNumber);
        $secondDigits = strlen($secondNumber);

        $firstMatches = array_filter($extractNumbers, fn($n) =>
            $n['position'] <= $firstRange && substr($n['number'], -$firstDigits) === $firstNumber
        );

        $secondMatches = array_filter($extractNumbers, fn($n) =>
            $n['position'] <= $secondRange && substr($n['number'], -$secondDigits) === $secondNumber
        );

        if (empty($firstMatches) || empty($secondMatches)) {
            return 0;
        }

        $multiplier = $this->redoblonaMultipliers[$firstRange][$secondRange] ?? 0;

        return $amount * $multiplier;
    }
}
