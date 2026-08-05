<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>System Update</title>
    <style>
        body {
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .card {
            background: #fff;
            border-radius: 12px;
            padding: 32px;
            max-width: 460px;
            width: 100%;
            margin: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
            text-align: center;
        }
        h1 {
            font-size: 20px;
            margin: 0 0 8px;
        }
        p {
            color: #64748b;
            font-size: 14px;
            line-height: 1.6;
        }
        .alert {
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 14px;
            margin-bottom: 16px;
        }
        .alert-success {
            background: #dcfce7;
            color: #166534;
        }
        .alert-error {
            background: #fee2e2;
            color: #991b1b;
        }
        form {
            margin-top: 16px;
        }
        button {
            background: #2563eb;
            color: #fff;
            border: 0;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover {
            background: #1d4ed8;
        }
        .muted {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>System Update</h1>
        <p>Run pending database migrations after deploying a new version of the application.</p>

        @if (session('success'))
            <div class="alert alert-success">{{ session('success') }}</div>
        @endif

        @if (session('error'))
            <div class="alert alert-error">{{ session('error') }}</div>
        @endif

        <form method="POST" action="{{ route('update.run') }}" onsubmit="return confirm('Run pending migrations? This may take a moment.');">
            @csrf
            <input type="hidden" name="confirm" value="yes">
            <button type="submit">Run Update</button>
        </form>

        <div class="muted">This action is restricted to super admins only.</div>
    </div>
</body>
</html>
