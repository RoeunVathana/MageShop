<?php

namespace App\Database\Query\Grammars;

use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\Grammars\PostgresGrammar as BasePostgresGrammar;

/**
 * Compile boolean comparisons as PostgreSQL boolean literals.
 *
 * Laravel's emulated PDO prepares convert boolean bindings to 1/0. PostgreSQL
 * does not allow comparing a boolean column to an integer, so public active
 * catalog queries fail with `boolean = integer` when they use PgBouncer.
 */
class PostgresGrammar extends BasePostgresGrammar
{
    /**
     * Compile a basic where clause without binding boolean values as integers.
     *
     * @param  array{column:string,operator:string,value:mixed}  $where
     */
    protected function whereBasic(Builder $query, $where): string
    {
        if (is_bool($where['value'])) {
            return $this->wrap($where['column'])
                .' '.$where['operator'].' '.($where['value'] ? 'true' : 'false');
        }

        return parent::whereBasic($query, $where);
    }
}
