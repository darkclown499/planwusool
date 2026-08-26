<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Models\State;
use App\Models\City;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    /**
     * Canonical allow-list provider — single config key.
     */
    private function allowedCountryCodes(): array
    {
        return config('storefront.supported_customer_countries', ['PSE', 'ISR', 'JOR']);
    }

    public function getCountries()
    {
        $allowed = $this->allowedCountryCodes();
        $countries = Country::active()
            ->whereIn('code', $allowed)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json($countries);
    }

    public function getStatesByCountry($countryId)
    {
        // Reject states for unsupported countries
        $country = Country::find($countryId);
        if (!$country || !in_array($country->code, $this->allowedCountryCodes(), true)) {
            return response()->json(['message' => 'الدولة غير مدعومة.'], 422);
        }

        $states = State::where('country_id', $countryId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json($states);
    }

    public function getCitiesByState($stateId)
    {
        $state = State::find($stateId);
        if (!$state) {
            return response()->json(['message' => 'المحافظة غير موجودة.'], 404);
        }
        $country = Country::find($state->country_id);
        if (!$country || !in_array($country->code, $this->allowedCountryCodes(), true)) {
            return response()->json(['message' => 'الدولة غير مدعومة.'], 422);
        }

        $cities = City::where('state_id', $stateId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($cities);
    }
}