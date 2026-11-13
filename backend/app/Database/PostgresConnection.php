<?php

namespace App\Database;

use DateTimeInterface;
use Illuminate\Database\PostgresConnection as BasePostgresConnection;

/**
 * Keep boolean bindings as PostgreSQL boolean literals.
 *
 * Laravel's default Connection::prepareBindings() normalizes booleans to
 * integers for PDO. That is valid for MySQL, but PostgreSQL rejects `1` and
 * `0` when the target column is boolean. Railway runs this application on
 * PostgreSQL (through PgBouncer), so the conversion must happen at the
 * connection boundary for inserts, updates, and pivot writes as well as
 * where clauses.
 */
class PostgresConnection extends BasePostgresConnection
{
    /**
     * Prepare bindings without converting booleans to integers.
     *
     * @param  array<int|string, mixed>  $bindings
     * @return array<int|string, mixed>
     */
    public function prepareBindings(array $bindings): array
    {
        $grammar = $this->getQueryGrammar();

        foreach ($bindings as $key => $value) {
            if ($value instanceof DateTimeInterface) {
                $bindings[$key] = $value->format($grammar->getDateFormat());
            } elseif (is_bool($value)) {
                // PDO pgsql accepts these strings and PostgreSQL casts them to
                // the destination boolean type without an integer mismatch.
                $bindings[$key] = $value ? 'true' : 'false';
            }
        }

        return $bindings;
    }
}
