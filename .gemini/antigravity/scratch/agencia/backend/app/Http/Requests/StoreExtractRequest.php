<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExtractRequest extends FormRequest
{
    public function authorize(): true
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lottery_id' => 'required|exists:lotteries,id',
            'draw_id'    => 'required|exists:draws,id',
            'draw_date'  => 'required|date',
            'numbers'    => 'required|array|size:20',
            'numbers.*.position' => 'required|integer|between:1,20',
            'numbers.*.number'   => 'required|string|max:4',
        ];
    }

    public function messages(): array
    {
        return [
            'numbers.size' => 'Deben cargarse exactamente 20 números (posición 1 a 20).',
        ];
    }
}
