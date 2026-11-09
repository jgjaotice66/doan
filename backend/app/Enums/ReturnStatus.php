<?php

namespace App\Enums;

enum ReturnStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Received = 'received';
    case Refunded = 'refunded';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Chờ duyệt',
            self::Approved => 'Đã duyệt – chờ khách gửi hàng',
            self::Received => 'Đã nhận hàng',
            self::Refunded => 'Đã hoàn tiền',
            self::Rejected => 'Từ chối',
        };
    }

    /**
     * Luồng: pending → approved → received → refunded; từ chối được khi chưa nhận hàng
     * (đã duyệt mà khách không gửi hàng thì vẫn từ chối được).
     *
     * @return list<self>
     */
    public function allowedNext(): array
    {
        return match ($this) {
            self::Pending => [self::Approved, self::Rejected],
            self::Approved => [self::Received, self::Rejected],
            self::Received => [self::Refunded],
            self::Refunded, self::Rejected => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedNext(), true);
    }

    /** Còn đang xử lý → mỗi đơn chỉ có tối đa 1 yêu cầu như vậy. */
    public function isOpen(): bool
    {
        return ! in_array($this, [self::Refunded, self::Rejected], true);
    }

    /** @return list<self> */
    public static function open(): array
    {
        return array_values(array_filter(self::cases(), fn (self $status) => $status->isOpen()));
    }

    /** Tên thao tác admin (= đuôi URL PATCH) dẫn tới trạng thái này. */
    public function action(): ?string
    {
        return match ($this) {
            self::Approved => 'approve',
            self::Received => 'receive',
            self::Refunded => 'refund',
            self::Rejected => 'reject',
            self::Pending => null,
        };
    }
}
