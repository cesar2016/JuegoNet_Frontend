<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Courier New', monospace; font-size: 10px; margin: 0; padding: 5px; }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 1px 3px; text-align: left; }
        th { border-bottom: 1px solid #000; }
        .text-right { text-align: right; }
    </style>
</head>
<body>
    <div class="center">
        <strong>TICKET</strong><br>
        FECHA/HORA: {{ $date }}<br>
        PASADOR: {{ $pasador }}
    </div>
    <div class="line"></div>
    <div class="center">
        SECUENCIA: {{ $sequence }}<br>
        {{ $sorteo }}<br>
        LOTERIAS: {{ $lotteries }}
    </div>
    <div class="line"></div>
    <table>
        <tr>
            <th>NUMERO</th>
            <th>TIPO</th>
            <th class="text-right">IMPORTE</th>
        </tr>
        @foreach($items as $item)
        <tr>
            <td>{{ $item->number }}</td>
            <td>{{ str_replace('_', ' ', $item->type) }}</td>
            <td class="text-right">${{ number_format($item->amount, 2) }}</td>
        </tr>
        @endforeach
        @foreach($redoblonas as $red)
        <tr>
            <td>{{ $red->first_number }}/{{ $red->second_number }}</td>
            <td>redoblona</td>
            <td class="text-right">${{ number_format($red->amount, 2) }}</td>
        </tr>
        @endforeach
    </table>
    <div class="line"></div>
    <table>
        <tr>
            <td><strong>SUBTOTAL:</strong></td>
            <td class="text-right">${{ number_format($subtotal, 2) }}</td>
        </tr>
        <tr>
            <td><strong>TOTAL:</strong></td>
            <td class="text-right">${{ number_format($total, 2) }}</td>
        </tr>
    </table>
</body>
</html>
