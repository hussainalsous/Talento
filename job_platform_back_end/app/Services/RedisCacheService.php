<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * Safe Redis cache wrapper.
 *
 * All public methods absorb Redis exceptions and log them — callers never
 * receive a Redis error; they receive null / false and fall back to MySQL.
 */
class RedisCacheService
{
    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /**
     * Fetch a cached value. Returns null on miss or Redis failure.
     */
    public function get(string $key): mixed
    {
        try {
            $raw = Redis::get($key);
            return $raw !== null ? json_decode($raw, true) : null;
        } catch (\Throwable $e) {
            Log::warning("Redis get failed [{$key}]: {$e->getMessage()}");
            return null;
        }
    }

    /**
     * Cache-aside: return cached value if present, otherwise run $callback,
     * store the result, and return it.
     */
    public function remember(string $key, int $ttl, callable $callback): mixed
    {
        $cached = $this->get($key);
        if ($cached !== null) {
            return $cached;
        }

        $value = $callback();
        $this->set($key, $value, $ttl);
        return $value;
    }

    // -------------------------------------------------------------------------
    // Write
    // -------------------------------------------------------------------------

    /**
     * Store a value with a TTL (seconds). Silently fails on Redis error.
     */
    public function set(string $key, mixed $value, int $ttl): void
    {
        try {
            Redis::setex($key, $ttl, json_encode($value));
        } catch (\Throwable $e) {
            Log::warning("Redis set failed [{$key}]: {$e->getMessage()}");
        }
    }

    // -------------------------------------------------------------------------
    // Invalidation
    // -------------------------------------------------------------------------

    /**
     * Delete one or more exact keys.
     */
    public function del(string ...$keys): void
    {
        if (empty($keys)) {
            return;
        }
        try {
            Redis::del(...$keys);
        } catch (\Throwable $e) {
            Log::warning('Redis del failed [' . implode(', ', $keys) . "]: {$e->getMessage()}");
        }
    }

    /**
     * Delete all keys matching a glob pattern using SCAN (safe for production).
     * Never uses KEYS * which blocks the server.
     *
     * Predis applies the configured key prefix (config database.redis.options.prefix)
     * to every key-based command (GET, SET, DEL) automatically, but NOT to the MATCH
     * pattern of SCAN — SCAN's MATCH is a pattern, not a key argument.
     * Without the fix below, delPattern('admin:foo:*') scans for 'admin:foo:*' while
     * keys are physically stored as '{prefix}admin:foo:*', finding nothing and deleting
     * nothing. The fix prepends the prefix to the SCAN pattern, and strips it from the
     * returned keys before passing them to del() (which would otherwise double-prefix).
     */
    public function delPattern(string $pattern): void
    {
        try {
            $prefix      = (string) config('database.redis.options.prefix', '');
            $scanPattern = $prefix . $pattern;
            $cursor      = '0';

            do {
                [$cursor, $keys] = Redis::scan($cursor, 'match', $scanPattern, 'count', 100);

                if (!empty($keys)) {
                    // SCAN returns the full physical key name (with prefix).
                    // del() will re-apply the prefix, so strip it first.
                    $unprefixed = $prefix !== ''
                        ? array_map(
                            fn($k) => str_starts_with($k, $prefix) ? substr($k, strlen($prefix)) : $k,
                            $keys
                          )
                        : $keys;

                    Redis::del(...$unprefixed);
                }
            } while ($cursor !== '0');

        } catch (\Throwable $e) {
            Log::warning("Redis delPattern failed [{$pattern}]: {$e->getMessage()}");
        }
    }

    // -------------------------------------------------------------------------
    // Key builder
    // -------------------------------------------------------------------------

    /**
     * Build a deterministic cache key from a prefix and a filters array.
     * Sorting the filters ensures that identical queries with different key
     * order produce the same cache key.
     */
    public function filterKey(string $prefix, array $filters): string
    {
        ksort($filters);
        // Remove null / empty values so ?role=&search= hits the same key as no filters
        $filters = array_filter($filters, fn($v) => $v !== null && $v !== '');
        return $prefix . ':' . md5(json_encode($filters));
    }
}
