<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBetRequest extends FormRequest
{
    public function authorize(): true
    {
        return true;
    }

    public function rules(): array
    {
        $validCombos = ['1:5', '1:10', '1:20', '5:5', '5:10', '5:20', '10:10', '10:20', '20:20'];

        return [
            'draw_id'     => 'required|exists:draws,id',
            'draw_date'   => 'required|date',
            'lottery_ids' => 'required|array|min:1',
            'lottery_ids.*' => 'exists:lotteries,id',
            'items'       => 'required_without:redoblonas|array',
            'items.*.number' => 'required|string|max:4',
            'items.*.type'   => 'required|in:primera,a_los_5,a_los_10,a_los_20',
            'items.*.amount' => 'required|numeric|min:1',
            'redoblonas'       => 'array',
            'redoblonas.*.first_number'  => 'required|string|size:2',
            'redoblonas.*.second_number' => 'required|string|size:2',
            'redoblonas.*.first_range'   => 'required|integer|in:1,5,10,20',
            'redoblonas.*.second_range'  => 'required|integer|in:1,5,10,20',
            'redoblonas.*.amount'        => 'required|numeric|min:1',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $redoblonas = $this->input('redoblonas', []);
            $valid = ['1:5', '1:10', '1:20', '5:5', '5:10', '5:20', '10:10', '10:20', '20:20'];

            foreach ($redoblonas as $i => $red) {
                $combo = ($red['first_range'] ?? '') . ':' . ($red['second_range'] ?? '');
                if (!in_array($combo, $valid, true)) {
                    $validator->errors()->add(
                        "redoblonas.{$i}.first_range",
                        "La combinación de rangos {$combo} no es válida."
                    );
                }
            }
        });
    }
}
