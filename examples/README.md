# Examples

Ready-to-run examples demonstrating yaml-pptr features.

## Available Examples

### login-demo

A simple login test on [Sauce Demo](https://www.saucedemo.com) that:
- Fills username and password
- Clicks the login button
- Waits for the inventory page
- Takes a screenshot

```bash
npm run example:login
```

Screenshot saved to `examples/login-demo/screenshots/inventory.png`

### load-test

A parallel load test with 3 workers running 2 iterations each (6 total runs):

```bash
npm run example:load
```

## Creating Your Own Example

1. Create a new directory in `examples/`
2. Add a `scenario.yaml` with your test scenarios
3. Add a `run.ts` script to execute it
4. Add a script to `package.json`
