<?php

namespace App\Social;

use Illuminate\Support\Arr;
use Laravel\Socialite\Two\AbstractProvider;
use Laravel\Socialite\Two\InvalidStateException;
use Laravel\Socialite\Two\ProviderInterface;
use Laravel\Socialite\Two\User;

class AppleProvider extends AbstractProvider implements ProviderInterface
{
    protected $scopes = ['name', 'email'];

    protected $scopeSeparator = ' ';

    protected $parameters = ['response_mode' => 'form_post'];

    protected $teamId;

    protected $keyId;

    protected $privateKey;

    public function configure($teamId, $keyId, $privateKey)
    {
        $this->teamId = $teamId;
        $this->keyId = $keyId;
        $this->privateKey = $privateKey;

        return $this;
    }

    protected function getAuthUrl($state)
    {
        return $this->buildAuthUrlFromBase('https://appleid.apple.com/auth/authorize', $state);
    }

    protected function getTokenUrl()
    {
        return 'https://appleid.apple.com/auth/token';
    }

    protected function getTokenFields($code)
    {
        return [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUrl,
            'client_id' => $this->clientId,
            'client_secret' => $this->makeClientSecret(),
        ];
    }

    public function user()
    {
        if ($this->user) {
            return $this->user;
        }

        if ($this->hasInvalidState()) {
            throw new InvalidStateException;
        }

        $response = $this->getAccessTokenResponse($this->getCode());

        $user = $this->getUserByToken($response);

        return $this->userInstance($response, $user);
    }

    protected function getUserByToken($token)
    {
        $data = [];

        $idToken = Arr::get($token, 'id_token');
        if ($idToken) {
            $data = array_merge($data, $this->decodeIdToken($idToken));
        } elseif (Arr::has($token, 'error')) {
            throw new InvalidStateException('Apple Sign In failed: ' . Arr::get($token, 'error', 'unknown error'));
        }

        // Apple only sends the name on the very first login, as a JSON string
        // in the "user" form field of the callback request.
        $userField = $this->request->input('user');
        if ($userField) {
            $userData = json_decode($userField, true);
            $name = trim(($userData['name']['firstName'] ?? '') . ' ' . ($userData['name']['lastName'] ?? ''));
            if ($name !== '') {
                $data['name'] = $name;
            }
        }

        return $data;
    }

    protected function mapUserToObject(array $user)
    {
        return (new User)->setRaw($user)->map([
            'id' => $user['sub'] ?? null,
            'name' => $user['name'] ?? null,
            'email' => $user['email'] ?? null,
            'email_verified' => $user['email_verified'] ?? null,
            'avatar' => null,
        ]);
    }

    protected function makeClientSecret()
    {
        $header = $this->base64UrlEncode(json_encode(['alg' => 'ES256', 'kid' => $this->keyId]));

        $now = time();
        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $this->teamId,
            'iat' => $now,
            'exp' => $now + 15552000, // valid for 180 days
            'aud' => 'https://appleid.apple.com',
            'sub' => $this->clientId,
        ]));

        $signingInput = $header . '.' . $claims;

        $privateKey = openssl_pkey_get_private($this->privateKey);
        if ($privateKey === false) {
            throw new \RuntimeException('Unable to load the Apple private key.');
        }

        openssl_sign($signingInput, $derSignature, $privateKey, OPENSSL_ALGO_SHA256);

        return $signingInput . '.' . $this->base64UrlEncode($this->derToRaw($derSignature));
    }

    protected function decodeIdToken($idToken)
    {
        $parts = explode('.', $idToken);
        $payload = isset($parts[1]) ? base64_decode(strtr($parts[1], '-_', '+/')) : '';

        return json_decode($payload, true) ?: [];
    }

    protected function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    protected function derToRaw($der)
    {
        // DER layout: 0x30 <seq len> [ 0x02 <r len> <r> ] [ 0x02 <s len> <s> ]
        $offset = 1; // the SEQUENCE length octet
        $length = ord($der[$offset]);
        $offset++;
        if ($length & 0x80) {
            $numBytes = $length & 0x7f;
            $length = 0;
            for ($i = 0; $i < $numBytes; $i++) {
                $length = ($length << 8) | ord($der[$offset + $i]);
            }
            $offset += $numBytes;
        }

        $offset++; // 0x02 tag for R
        $rLen = ord($der[$offset]);
        $offset++;
        $r = substr($der, $offset, $rLen);
        $offset += $rLen;

        $offset++; // 0x02 tag for S
        $sLen = ord($der[$offset]);
        $offset++;
        $s = substr($der, $offset, $sLen);

        return $this->asn1IntegerToRaw($r) . $this->asn1IntegerToRaw($s);
    }

    protected function asn1IntegerToRaw($bytes)
    {
        $bytes = ltrim($bytes, "\x00");
        if (strlen($bytes) > 32) {
            throw new \RuntimeException('Invalid ECDSA signature integer.');
        }

        return str_pad($bytes, 32, "\x00", STR_PAD_LEFT);
    }
}
