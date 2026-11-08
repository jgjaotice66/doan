<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['author_id', 'title', 'slug', 'thumbnail', 'excerpt', 'content', 'is_published', 'is_featured', 'published_at'])]
class Post extends Model
{
    use HasFactory;

    /** Cột cho danh sách — bỏ `content` (longText) cho nhẹ. */
    public const LIST_COLUMNS = ['id', 'author_id', 'title', 'slug', 'thumbnail', 'excerpt', 'is_published', 'is_featured', 'published_at', 'created_at', 'updated_at'];

    public const STATUS_LABELS = [
        'draft' => 'Nháp',
        'scheduled' => 'Hẹn giờ',
        'published' => 'Đã đăng',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'is_featured' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    /**
     * Bài đã xuất bản và đã tới thời điểm hiển thị.
     */
    #[Scope]
    protected function published(Builder $query): Builder
    {
        return $query->where('is_published', true)->where('published_at', '<=', now());
    }

    /**
     * Đã bật xuất bản nhưng chưa tới giờ đăng.
     */
    #[Scope]
    protected function scheduled(Builder $query): Builder
    {
        return $query->where('is_published', true)->where('published_at', '>', now());
    }

    #[Scope]
    protected function draft(Builder $query): Builder
    {
        return $query->where(fn ($q) => $q->where('is_published', false)->orWhereNull('published_at'));
    }

    /**
     * draft | scheduled | published — khớp với 3 scope ở trên.
     */
    public function status(): string
    {
        return match (true) {
            ! $this->is_published || ! $this->published_at => 'draft',
            $this->published_at->isFuture() => 'scheduled',
            default => 'published',
        };
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
