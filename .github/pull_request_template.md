## 📦 Summary of Changes

*Describe what this PR changes, adds, or fixes.*

## 🧪 Quality Verification Checklist

- [ ] All PHPUnit feature and unit tests pass (`php artisan test`)
- [ ] Code style verified with Laravel Pint (`php vendor/bin/pint --test`)
- [ ] TypeScript typecheck passes (`npx tsc -b`)
- [ ] Oxlint passes (`npm run lint`)
- [ ] Frontend production build succeeds (`npm run build`)
- [ ] No database columns or existing customer/order/inventory records modified destructively
- [ ] Database transactions and idempotency preserved for stock & payment operations

## 🚀 Deployment Notes

- [ ] Database migrations required?
- [ ] New environment variables required on Railway?
- [ ] External webhook or callback changes?

