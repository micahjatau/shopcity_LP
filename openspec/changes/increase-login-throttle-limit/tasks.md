## 1. Update login limit

- [x] 1.1 Raise the `/auth/login` throttle limit to 10 while preserving the 15-minute window and existing keys.
- [x] 1.2 Add regression coverage proving login uses 10 and related authentication routes remain at 5.
- [x] 1.3 Run focused authentication tests and applicable repository checks.
