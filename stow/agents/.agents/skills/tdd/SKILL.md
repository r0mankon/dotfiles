---
name: tdd
description: Test-driven development SCOPED to pure logic + tricky/security bug fixes (not UI, route glue, or third-party wiring). Red-green-refactor via vertical slices. Use when building or fixing behavior that's exercisable through a public interface without mocking framework/third-party internals, or when reproducing a subtle bug test-first. For UI/integration, verify with real feedback (build/curl/screenshot) instead.
---

# Test-Driven Development

## When TDD applies here (scope + efficiency)

TDD is a scalpel, not a gate. It pays for itself on **pure logic behind a small interface** and on **reproducing a subtle bug** — and it *costs* velocity when forced onto UI, glue, and third-party wiring. Scope it deliberately; don't let red-green ceremony slow a task that is mostly not TDD-shaped.

**Test-first (do TDD):**

- **Pure / deep modules with injected effects** — moderation/policy rules, redaction, parsing, rate-limit math, grouping/threading keys, dispatch decisions, token sign/verify. Small interface, real logic, no framework in the way → tests read as specs and survive refactors.
- **Subtle logic or security branches** — before fixing, write the failing test that *reproduces* the bug through the public interface, then fix. The test proves the bug existed and guards the fix.

**Don't TDD (verify another way):**

- **UI / components / styling** — verify by rendering / screenshot.
- **API-route glue** (auth + DB + side effects) — verify with a real request (curl) against a running server.
- **Third-party integration** (payment/auth/push SDKs, framework SSR/caching/build) — verify against the real thing (build, smoke-test, a live call). A mock of Stripe / an auth lib / the framework tests the *shape*, not the behavior — and the bugs live in the seams the mock can't see.
- **Config** — verify by build.

**The gate — ask before writing a test:** _Can I exercise this behavior through a public interface without mocking framework or third-party internals?_

- **Yes** → TDD it, vertically (one test → one implementation).
- **No** → don't force a unit test. Verify with the real feedback loop (curl / build / smoke / screenshot), note what you verified and how, and move on.

**Efficiency rule:** the cost of writing the test first must be repaid by catching a *real* regression. If the value of the code lives in wiring a unit test can't observe, the honest, faster move is a real-world check — not a mock that passes while the integration breaks. If most of a task is the "don't TDD" kind, reach for TDD only on the pure-logic slices inside it.

## Philosophy

**Core principle**: Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: they exercise real code paths through public APIs. They describe _what_ the system does, not _how_ it does it. A good test reads like a specification - "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

**Bad tests** are coupled to implementation. They mock internal collaborators, test private methods, or verify through external means (like querying a database directly instead of using the interface). The warning sign: your test breaks when you refactor, but behavior hasn't changed. If you rename an internal function and tests fail, those tests were testing implementation, not behavior.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** This is "horizontal slicing" - treating RED as "write all tests" and GREEN as "write all code."

This produces **crap tests**:

- Tests written in bulk test _imagined_ behavior, not _actual_ behavior
- You end up testing the _shape_ of things (data structures, function signatures) rather than user-facing behavior
- Tests become insensitive to real changes - they pass when behavior breaks, fail when behavior is fine
- You outrun your headlights, committing to test structure before understanding the implementation

**Correct approach**: Vertical slices via tracer bullets. One test → one implementation → repeat. Each test responds to what you learned from the previous cycle. Because you just wrote the code, you know exactly what behavior matters and how to verify it.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
  ...
```

## Workflow

### 1. Planning

When exploring the codebase, use the project's domain glossary so that test names and interface vocabulary match the project's language, and respect ADRs in the area you're touching.

Before writing any code:

- [ ] **Pass the gate**: this behavior is exercisable through a public interface without mocking framework/third-party internals. If not → verify it another way (build/curl/screenshot), don't TDD it.
- [ ] Confirm with user what interface changes are needed
- [ ] Confirm with user which behaviors to test (prioritize)
- [ ] Identify opportunities for [deep modules](deep-modules.md) (small interface, deep implementation)
- [ ] Design interfaces for [testability](interface-design.md)
- [ ] List the behaviors to test (not implementation steps)
- [ ] Get user approval on the plan

Ask: "What should the public interface look like? Which behaviors are most important to test?"

**You can't test everything.** Confirm with the user exactly which behaviors matter most. Focus testing effort on critical paths and complex logic, not every possible edge case.

### 2. Tracer Bullet

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior → test fails
GREEN: Write minimal code to pass → test passes
```

This is your tracer bullet - proves the path works end-to-end.

### 3. Incremental Loop

For each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:

- One test at a time
- Only enough code to pass current test
- Don't anticipate future tests
- Keep tests focused on observable behavior

### 4. Refactor

After all tests pass, look for [refactor candidates](refactoring.md):

- [ ] Extract duplication
- [ ] Deepen modules (move complexity behind simple interfaces)
- [ ] Apply SOLID principles where natural
- [ ] Consider what new code reveals about existing code
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

## Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```
