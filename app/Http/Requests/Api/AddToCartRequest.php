<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddToCartRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'store_id'   => 'required|exists:stores,id',
            'product_id' => [
                'required',
                Rule::exists('products', 'id')->where('store_id', $this->input('store_id')),
            ],
            'quantity' => 'required|integer|min:1',
            'variants' => 'nullable|array',
        ];
    }
}
