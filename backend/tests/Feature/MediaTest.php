<?php

namespace Tests\Feature;

use App\Support\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class MediaTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::disk('public')->put('brands/old.png', 'x');
    }

    public function test_swap_saves_new_file_then_deletes_old(): void
    {
        $saved = Media::swap('brands/old.png', UploadedFile::fake()->image('new.png'), false, 'brands', fn (?string $path) => $path);

        Storage::disk('public')->assertExists($saved);
        Storage::disk('public')->assertMissing('brands/old.png');
    }

    public function test_swap_keeps_old_file_and_removes_new_one_when_saving_fails(): void
    {
        try {
            Media::swap('brands/old.png', UploadedFile::fake()->image('new.png'), false, 'brands', function () {
                throw new RuntimeException('DB lỗi');
            });
            $this->fail('Phải ném lại exception.');
        } catch (RuntimeException) {
            // Ảnh cũ vẫn còn (DB vẫn trỏ tới nó), ảnh mới không bị bỏ rơi.
            Storage::disk('public')->assertExists('brands/old.png');
            $this->assertSame(['brands/old.png'], Storage::disk('public')->allFiles('brands'));
        }
    }

    public function test_swap_remove_deletes_old_and_saves_null(): void
    {
        $saved = Media::swap('brands/old.png', null, true, 'brands', fn (?string $path) => $path);

        $this->assertNull($saved);
        Storage::disk('public')->assertMissing('brands/old.png');
    }

    public function test_swap_without_changes_keeps_current(): void
    {
        $saved = Media::swap('brands/old.png', null, false, 'brands', fn (?string $path) => $path);

        $this->assertSame('brands/old.png', $saved);
        Storage::disk('public')->assertExists('brands/old.png');
    }
}
