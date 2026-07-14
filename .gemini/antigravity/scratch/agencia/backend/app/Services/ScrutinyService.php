<?php

namespace App\Services;

use App\Enums\BetType;
use App\Models\Bet;
use App\Models\DrawResult;
use App\Models\Extract;
use Illuminate\Support\Facades\DB;

class ScrutinyService
{
    public function __construct(
        private readonly PrizeCalculator $calculator
    ) {}

    public function run(Extract $extract): void
    {
        $extract->load('numbers');

        $extractNumbers = $extract->numbers->map(fn($n) => [
            'position' => $n->position,
            'number'   => $n->number,
        ])->toArray();

        $bets = Bet::where('draw_id', $extract->draw_id)
            ->where('draw_date', $extract->draw_date)
            ->with(['items', 'redoblonas', 'lotteries'])
            ->get();

        DB::transaction(function () use ($extract, $bets, $extractNumbers) {
            foreach ($bets as $bet) {
                $betLotteryIds = $bet->lotteries->pluck('id')->toArray();

                if (!in_array($extract->lottery_id, $betLotteryIds)) {
                    continue;
                }

                $totalPrize = 0;
                $won = false;

                foreach ($bet->items as $item) {
                    $type = BetType::from($item->type);

                    if ($type === BetType::Primera) {
                        $result = $this->calculator->calculatePrimera($item->number, $item->amount, $extractNumbers);
                    } else {
                        $result = $this->calculator->calculatePremio($item->number, $item->amount, $type, $extractNumbers);
                    }

                    if ($result['prize'] > 0) {
                        $won = true;
                        $totalPrize += $result['prize'];

                        DrawResult::create([
                            'extract_id'   => $extract->id,
                            'bet_id'       => $bet->id,
                            'bet_item_id'  => $item->id,
                            'position'     => $result['position'],
                            'prize_amount' => $result['prize'],
                            'status'       => 'pending',
                        ]);
                    }
                }

                foreach ($bet->redoblonas as $redoblona) {
                    $prize = $this->calculator->calculateRedoblona(
                        $redoblona->amount,
                        $redoblona->first_range,
                        $redoblona->second_range,
                        $redoblona->first_number,
                        $redoblona->second_number,
                        $extractNumbers
                    );

                    if ($prize > 0) {
                        $won = true;
                        $totalPrize += $prize;
                        DrawResult::create([
                            'extract_id'   => $extract->id,
                            'bet_id'       => $bet->id,
                            'redoblona_id' => $redoblona->id,
                            'prize_amount' => $prize,
                            'status'       => 'pending',
                        ]);
                    }
                }

                if ($won) {
                    $bet->update(['status' => 'won']);
                } elseif ($bet->status === 'active') {
                    $bet->update(['status' => 'lost']);
                }
            }

            $extract->update([
                'status'       => 'completed',
                'processed_at' => now(),
            ]);
        });
    }
}
