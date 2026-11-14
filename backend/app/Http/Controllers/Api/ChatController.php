<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ChatRequest;
use App\Services\ChatbotService;
use Illuminate\Http\JsonResponse;

class ChatController extends Controller
{
    /**
     * Trả lời một tin nhắn chatbot. Route công khai: có token thì tra được đơn của chính khách đó.
     */
    public function __invoke(ChatRequest $request, ChatbotService $chatbot): JsonResponse
    {
        return response()->json([
            'data' => $chatbot->reply($request->validated('message'), $request->chatContext(), $request->user('sanctum')),
        ]);
    }
}
