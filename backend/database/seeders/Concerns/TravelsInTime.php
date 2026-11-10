<?php

namespace Database\Seeders\Concerns;

use Closure;
use DateTimeInterface;
use Illuminate\Support\Carbon;

/**
 * Chạy một đoạn seed như thể đang ở thời điểm $at: now(), created_at, mã đơn (TSyyMMdd…), completed_at…
 * đều lấy theo thời điểm đó. Luôn trả đồng hồ về như cũ, kể cả khi đoạn code ném lỗi.
 */
trait TravelsInTime
{
    /**
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    protected function at(DateTimeInterface $at, Closure $callback): mixed
    {
        $previous = Carbon::getTestNow();
        Carbon::setTestNow(Carbon::instance($at));

        try {
            return $callback();
        } finally {
            Carbon::setTestNow($previous);
        }
    }
}
