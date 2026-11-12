<?php

namespace App\Database\Query\Grammars;

use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\Grammars\PostgresGrammar as BasePostgresGrammar;

/**
 * Compile boolean comparisons as PostgreSQL boolean expressions.
 *
 * Laravel's emulated PDO prepares convert boolean bindings to 1/0. PostgreSQL
 * does not allow comparing a boolean column to an integer, so public active
 * catalog queries fail with `boolean = integer` when they use PgBouncer. The
 * placeholder must remain in the SQL because Laravel still supplies the
 * original binding after grammar compilation.
 */
class PostgresGrammar extends BasePostgresGrammar
{
    private const BOOLEAN_EXPRESSION = '(case when cast(? as text) in (\'1\', \'true\', \'t\', \'yes\', \'on\') then true else false end)';

    /**
     * Compile a basic where clause without comparing boolean columns to ints.
     *
     * @param  array{column:string,operator:string,value:mixed}  $where
     */
    protected function whereBasic(Builder $query, $where): string
    {
        if (is_bool($where['value'])) {
            return $this->wrap($where['column'])
                .' '.$where['operator'].' '.self::BOOLEAN_EXPRESSION;
        }

        return parent::whereBasic($query, $where);
    }
}
