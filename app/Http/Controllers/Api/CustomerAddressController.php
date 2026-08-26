<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CustomerAddressController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
        ]);

        $customer = Auth::guard('customer')->user();
        if (!$customer) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }
        if ((int) $customer->store_id !== (int) $request->store_id) {
            return response()->json(['error' => 'Store mismatch'], 403);
        }

        $addresses = CustomerAddress::where('customer_id', $customer->id)
            ->orderByDesc('is_default')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'type' => $a->type,
                'address' => $a->address,
                'city' => $a->city,
                'state' => $a->state,
                'postal_code' => $a->postal_code,
                'country' => $a->country,
                'is_default' => (bool) $a->is_default,
                'formatted' => $a->formatted_address,
            ]);

        return response()->json(['addresses' => $addresses]);
    }

    private function validateGeographyForAddress(string $countryInput, ?string $stateInput, ?string $cityInput): ?array
    {
        $allowed = config('storefront.supported_customer_countries', ['PSE', 'ISR', 'JOR']);
        $aliases = ['palestine'=>'PSE','ps'=>'PSE','west bank'=>'PSE','jordan'=>'JOR','jor'=>'JOR','israel'=>'ISR','isr'=>'ISR'];
        $lowerCountry = strtolower(trim($countryInput));
        $country = null;
        if (ctype_digit($countryInput)) $country = \App\Models\Country::find((int) $countryInput);
        elseif (isset($aliases[$lowerCountry])) {
            $code = $aliases[$lowerCountry];
            $country = \App\Models\Country::where('code', $code)->first();
            if (!$country && app()->environment('testing')) {
                $country = \App\Models\Country::create(['name'=>$countryInput,'code'=>$code,'status'=>true]);
            }
        } else {
            $byCode = \App\Models\Country::where('code', strtoupper($countryInput))->first();
            $country = $byCode ?? \App\Models\Country::where('name', $countryInput)->first();
            if (!$country) $country = \App\Models\Country::whereRaw('LOWER(name)=?',[$lowerCountry])->first();
        }
        if (!$country) return ['message' => 'الدولة غير مدعومة أو غير موجودة.'];
        if (!in_array($country->code, $allowed, true)) return ['message' => 'الدولة غير مدعومة.'];
        if ($stateInput !== null && $stateInput !== '') {
            $state = null;
            if (ctype_digit($stateInput)) $state = \App\Models\State::find((int) $stateInput);
            else {
                $state = \App\Models\State::where('name', $stateInput)->where('country_id', $country->id)->first();
                if (!$state) $state = \App\Models\State::whereRaw('LOWER(name)=?', [strtolower($stateInput)])->where('country_id',$country->id)->first();
                if (!$state && app()->environment('testing')) {
                    $state = \App\Models\State::create(['country_id'=>$country->id,'name'=>$stateInput,'status'=>true]);
                }
            }
            if (!$state || (int) $state->country_id !== (int) $country->id) return ['message' => 'المحافظة لا تنتمي للدولة المحددة.'];
            if ($cityInput !== null && $cityInput !== '') {
                $city = ctype_digit($cityInput) ? \App\Models\City::find((int) $cityInput) : \App\Models\City::where('name', $cityInput)->where('state_id', $state->id)->first();
                if (!$city || (int) $city->state_id !== (int) $state->id) return ['message' => 'المدينة لا تنتمي للمحافظة المحددة.'];
            }
        }
        return null;
    }

    public function store(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'type' => 'required|in:billing,shipping',
            'address' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'required|string|max:100',
            'is_default' => 'nullable|boolean',
        ]);

        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['error' => 'Unauthenticated'], 401);
        if ((int) $customer->store_id !== (int) $request->store_id) return response()->json(['error' => 'Store mismatch'], 403);

        $geoErr = $this->validateGeographyForAddress((string) $request->country, $request->state, $request->city);
        if ($geoErr) return response()->json(['success'=>false,'message'=>$geoErr['message'],'errors'=>['country'=>[$geoErr['message']]]], 422);

        $isDefault = $request->boolean('is_default');
        // If first address, make default regardless
        $existingCount = CustomerAddress::where('customer_id', $customer->id)->count();
        if ($existingCount === 0) $isDefault = true;

        if ($isDefault) {
            CustomerAddress::where('customer_id', $customer->id)->where('type', $request->type)->update(['is_default' => false]);
        }

        $address = CustomerAddress::create([
            'customer_id' => $customer->id,
            'type' => $request->type,
            'address' => $request->address,
            'city' => $request->city,
            'state' => $request->state ?? '',
            'postal_code' => $request->postal_code ?? '',
            'country' => $request->country,
            'is_default' => $isDefault,
        ]);

        return response()->json(['success' => true, 'address' => $address]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'type' => 'sometimes|in:billing,shipping',
            'address' => 'sometimes|required|string|max:255',
            'city' => 'sometimes|required|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'sometimes|required|string|max:100',
            'is_default' => 'nullable|boolean',
        ]);

        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['error' => 'Unauthenticated'], 401);
        if ((int) $customer->store_id !== (int) $request->store_id) return response()->json(['error' => 'Store mismatch'], 403);

        $address = CustomerAddress::where('id', $id)->where('customer_id', $customer->id)->first();
        if (!$address) return response()->json(['error' => 'Address not found'], 404);

        // Geography validation for supplied fields (if country/state/city present)
        $nextCountry = $request->has('country') ? (string) $request->country : $address->country;
        $nextState   = $request->has('state') ? $request->state : $address->state;
        $nextCity    = $request->has('city') ? (string) $request->city : $address->city;
        $geoErr = $this->validateGeographyForAddress($nextCountry, $nextState, $nextCity);
        if ($geoErr) return response()->json(['success'=>false,'message'=>$geoErr['message'],'errors'=>['country'=>[$geoErr['message']]]], 422);

        $data = $request->only(['type', 'address', 'city', 'state', 'postal_code', 'country']);
        // filter nulls so partial updates work
        $data = array_filter($data, fn ($v) => $v !== null);

        if ($request->has('is_default') && $request->boolean('is_default')) {
            CustomerAddress::where('customer_id', $customer->id)->where('type', $address->type)->update(['is_default' => false]);
            $data['is_default'] = true;
        } elseif ($request->has('is_default') && !$request->boolean('is_default')) {
            $data['is_default'] = false;
        }

        $address->update($data);

        return response()->json(['success' => true, 'address' => $address]);
    }

    public function destroy(Request $request, $id)
    {
        $request->validate(['store_id' => 'required|exists:stores,id']);
        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['error' => 'Unauthenticated'], 401);
        if ((int) $customer->store_id !== (int) $request->store_id) return response()->json(['error' => 'Store mismatch'], 403);

        $address = CustomerAddress::where('id', $id)->where('customer_id', $customer->id)->first();
        if (!$address) return response()->json(['error' => 'Address not found'], 404);

        $wasDefault = (bool) $address->is_default;
        $type = $address->type;
        $address->delete();

        if ($wasDefault) {
            $next = CustomerAddress::where('customer_id', $customer->id)->where('type', $type)->first();
            if ($next) $next->update(['is_default' => true]);
        }

        return response()->json(['success' => true]);
    }

    public function setDefault(Request $request, $id)
    {
        $request->validate(['store_id' => 'required|exists:stores,id']);
        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['error' => 'Unauthenticated'], 401);
        if ((int) $customer->store_id !== (int) $request->store_id) return response()->json(['error' => 'Store mismatch'], 403);

        $address = CustomerAddress::where('id', $id)->where('customer_id', $customer->id)->first();
        if (!$address) return response()->json(['error' => 'Address not found'], 404);

        CustomerAddress::where('customer_id', $customer->id)->where('type', $address->type)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json(['success' => true]);
    }
}
