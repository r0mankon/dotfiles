- Always spawn subagents for research
- 

- Prefer self-documenting code over comments
- But you must also write verbose comments for AI collaboration with `@ AI Context: ` prefix. This will help both me and you to understand the code and iterate just reading the comments instead of the understanding the whole codebase. This comments cant be stipped out with a separate tool called `strip-verbose-reasoning-comments` or "strip out verbose comments" phrase. But shouldn't be deleted most of the time and should summerize if they're raw reasoning back and forth comments befor the final decision.

- Feel free to ask many questions. If you are in doubt of my intent, don't guess. Ask.
- Try to ask questions with your recommeded answers as options. Would prefer interactive QA prompt instead of plain text answer.
- You can commit yourself but must follow this rule:
  You will commit before each phase not after. You'll understand my prompt and decide whether its a follow-up and
  should be in one commit or it disconnected and need to commit the previous work first and continue working on that prompt and
  wait for the next prompt before commiting that round.

  Though even if a follow-up prompt/task/discussion feel connected but bigger, then you should commit the previous work and treat the current as separate phase.

  You shouldn't start commiting unless its a running project, a newly initialized repo and we're gonna throw bunch of ideas/work before the mvp or first/second real commit.

- Delete/Remove: `trash` with no args instead of `rm`
- Search: `rg` instead of `grep`
- Find: `fd` instead of `find`  
- Visualization: `tree --git-ignore` and `tree`. Prefer --git-ignore version most of the time to save output token.

- Reasoning: Keep chain‑of‑thought private; present conclusions and key steps.
- Brevity: Keep every token purposeful.

- Put any non project and temp files inside `NOGIT` folder. This filder will be globally ignored by git.
- Never put Co-authored-by in commit messages

# Hard rule for NextJS

Never make or convert a full page to dynamic or ISR for a dynamic component in that page. Make the leaf component client and use api routes with proper caching and revalidation. If makes sense propose for PPR. You must confirm the user about these decisions using your interactive QA prompt not just plain text in the output, which could be missed easily.

# Coding Guidelines

This document outlines the coding standards, architectural decisions, and best practices. I must follow these rules for all new code and refactoring.

## Project Structure & Organization

### Component Location
- **Co-location**: Always co-locate components/ in the `page.tsx` folder if they are specific to that page.
- **Global Components**: Move/Put components to `src/components` only if they are reused across multiple pages.
- **Common Components**: Use `src/components/common` for small to medium reusable components (e.g., `Badge`, `Avatar`, `Dropdown`).
- Don't name the folder`components/ui`

### Server vs. Client Components
- **Pages are Server**: Never convert a `page.tsx` to a client component.
- **Leaves are Client**: Keep client-side logic (`'use client'`) restricted to individual leaf components.
- **Layouts**: `layout.tsx` should generally always be server components.

### File Naming
- **Components**: PascalCase (e.g., `PropertyCard.tsx`, `SellerCard.tsx`).
- **Utilities**: camelCase (e.g., `cn.ts`).
- **Pages & Layout**: (e.g., `site-layout`, `privacy-policy`).
- **Types**: `types.ts` (for common types).

## Styling Guidelines

**Primary Rule**: Use **Tailwind CSS** for all new styling. Do not use SCSS or CSS modules for new code.

### Handling Variants & Conditionals
- **Complex Components**: Use `tailwind-variants` (`tv`) when a component has multiple slots or complex variant logic.

- **Simple Components**: Use the `cn` utility for simple conditional classes.
  - *Example*:
    ```tsx
    <RDropdown.Content
      className={cn(
        'tw-z-[1301] tw-min-w-[220px] tw-rounded tw-bg-white tw-text-black tw-shadow-xl',
        props.className
      )}
    >
      {props.children}
    </RDropdown.Content>
    ```
- **Anti-Pattern**: Do NOT use manual string interpolation or `if/else` logic for classes.
- Don't use `cva` or class-variance-authority, prefer `tv`

### Legacy Styles (Bootstrap)
- **Ignore**: Do not use Bootstrap styles or `react-bootstrap` components for new code.
- **Maintenance**: Do not modify or replace existing Bootstrap usage unless explicitly asked, but do not introduce it in new features.

## Component Architecture & Code Hierarchy

### Structure
```tsx
// imports

// initializations

interface Props {}

function ComponentName(props: Props) {
  // passive states (comes from the outside)
  // active states (both used by this component or it's child)

  // derived states (depends on other states above)

  // event handlers
  // & functions that rely on some internal states

  // effects

  // jsx
}

// local functions that don't have to be inside the component function closure
function LocalFunction() {}

// local utils

// local validation schema

export default ComponentName;
```

#### Prefer destructuring props in separate line instead of inline when there's more than 3 items

Instead of this:
```ts
function Button<T extends React.ElementType = 'button'>({
  as,
  children,
  className
  ...rest
}: Props<T>) {}
```

Do this:
```ts
function Button(props: Props) {
  const { as, children, className ...rest } = props;
```

#### Always prefere naming interface `Props` over `ButtonProps` unless it exports for other other components to use, then name it `ButtonProps`

### Reusable Component Patterns
- **Radix UI**: Wrap Radix UI primitives for accessible, reusable components.
- **Compound Components**: Use dot notation for sub-components.
  - *Example*: `SellerCard.tsx`
    ```tsx
    // Main Component
    function SellerCard({ seller, ...props }: Props) {
       // ...
       <SellerCard.Name>{/*...*/}</SellerCard.Name>
       // ...
    }

    // Sub-component attached to main component
    SellerCard.Name = (props: { children: React.ReactNode }) => {
      return (
        <div className='tw-relative tw-self-start'>
          <h4 className='!tw-mb-0 tw-max-w-[250px] tw-truncate tw-capitalize tw-text-primary'>
            {props.children}
          </h4>
          {/* ... */}
        </div>
      );
    };
    ```
- **Images**: ALWAYS prefer `next/image`.
- **Icons**: Use Phosphor Icons from (`@phosphor-icons/react/dist/ssr`).

## State Management
- **Preference**: Prefer local react states instead of global states, you can use the existing ones if exist.
- **Complex Global State**: Use Zustand with Immer middleware when starting new projects only if necessary

## API
- use fetchResult(), a fetch wrapper that returns data or error as { data, error } (discriminated union, findme style)
- create one for new projects if doesn't exist

## Workflow
- **Analysis**: Before analyzing code, analyze `README.md`.
- **Implementation**: Follow the `tv` and `cn` + Radix pattern.
  - `tv` Example:
    ```tsx
    const card = tv({
      slots: { base: 'tw-flex', header: 'tw-p-4' },
      variants: { variant: { default: { base: 'tw-bg-white' } } }
    });
    ```
  - `cn` + Radix Example:
    ```tsx
    <RDropdown.Content className={cn('tw-z-50 tw-bg-white', className)}>
      {children}
    </RDropdown.Content>
    ```

#### `cn` Usually defined in lib/cn.ts like this:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## MCP
- Use `next-devtools` when working with nextjs projects
- Use `motion` when working with `motion` or `framer-motion`

## Libraries

If Context7 MCP exist, Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.

## React 
Mirrored and shortened from gemini-cli GEMINI.md
Mirrored and adjusted from react-mcp-server

## Role
Act as a React + Next.js optimization expert. Prioritize patterns that enable React Compiler optimizations, reduce re-renders, and improve performance.
## Core Principles
- **Functional Only**: Use functional components and Hooks exclusively. No class components.
- **Purity**: Render logic **must** be pure. Side effects belong in event handlers or `useEffect`, never in the render body.
- **Immutability**: Never mutate state directly. Use spread syntax or immutable patterns with state setters.
- **Data Flow**: Unidirectional (props down). Lift state or use Context/Server State; avoid syncing local state manually.
## Hooks & Effects
- **Rules of Hooks**: Call unconditionally at the top level.
- **`useEffect` Discipline**:
  - **Minimize usage**: Derive state during render whenever possible.
  - **Purpose**: Strictly for synchronization with external systems.
  - **Performance**: **NO** `setState` inside effects (causes loops/perf degradation).
  - **Correctness**: Always include cleanup functions and exhaustive dependencies.
- **Refs**: Use only for non-reactive escape hatches (focus, animations). **Never** read/write `ref.current` during render.
## Architecture & Performance
- **Composition**: Prefer small, composable components and custom hooks over monoliths.
- **Concurrency**: Ensure components are idempotent (safe for multiple renders). Use functional state updates (`set(prev => prev + 1)`).
- **Data Fetching**: Prevent waterfalls. Use parallel fetching, Server Components, and Suspense. Co-locate data requirements.
- **React Compiler**: **Omit** `useMemo`, `useCallback`, and `React.memo` by default. Trust the compiler for memoization unless profiling proves otherwise.
- **UX**: Implement non-blocking states (Skeletons > Spinners), Error Boundaries, and optimistic UI.

### Process

1. Analyze the user's code for optimization opportunities:
   - Check for React anti-patterns that prevent compiler optimization
   - Look for component structure issues that limit compiler effectiveness
   - Think about each suggestion you are making and consult React docs for best
     practices

2. Provide actionable guidance:
   - Explain specific code changes with clear reasoning
   - Show before/after examples when suggesting changes
   - Only suggest changes that meaningfully improve optimization potential

### Optimization Guidelines

- State updates should be structured to enable granular updates
- Side effects should be isolated and dependencies clearly defined

## Comments policy

Write high-value comments if necessary. Avoid talking to the user through
comments.

- Cleanup your own reasoning comments after implementing code
- Never add numbered comments, and comments that resemble or answer a requirement plan or comments that sound like made for product managers
- Never write too many comments to explain named things variables, interfaces, fields, functions
- Always keep comments concise and short

## Others

- Always place new lines before and after if blocks and return statement
- Prefer writing if blocks, don't inline the statement unless it's under 60 chars or less long line
- Always place new lines before and after try catch blocks
- Never do this, this is not needed anymore
```ts
import * as React from 'react';
```
- Always import react libraries like this:
```ts
import { useEffect } from 'react';
```

- Do this for all phosphor-icons
- Importng Icon as { CaretLeft } from phosphor-icons is deprecated, import { CaretLeftIcon } instead
- Always import icons from `@phosphor-icons/react/dist/ssr`
- Never pick other icon library unless mentioned
- Always use `motion` instead of `framer-motion`
- Always prefer LazyMotion strict mode
- `import * as m from 'motion/react-m';`

- Always use `antialiased` for new tailwind projects in the body element in root layout
- Always use `git mv` for moving and renaming files and folder
- Always use `trash` for deleting files and folder
- Always use `trash` instead of `rm` or `rm -rf`
- Never install or build anything that requires x86_64 arch
- When visiting a url, check for markdown version by attaching `.md` at the end of the path, otherwise use token efficient method to read a webpage
- Always prefer color text-primary, text-secondary etc over explicit similar color like text-gray-500

# Subagents, Fan-out & Token Cost

Measured 2026-08-19: one 23-agent Opus 5 fan-out burned 183.6M tokens in ~20
minutes. Output was 0.5M of that (0.3%) — the other 99% was cache reads, i.e.
the same context replayed on every turn of every agent. Cost scales with
`context size x turns x agents`, not with how much the agents write.

## Model tier
- Big fan-outs (3+ parallel agents) run on **Sonnet** by default. Only use a
  premium tier — Opus, Fable, or anything Mythos-class — for a fleet when I
  explicitly ask for it.
- The parent (or another higher-tier model) **must verify** what the fleet
  returns. Cheap agents find and draft; the expensive model checks, resolves
  conflicts, and decides. Never ship a fleet's output unverified.
- Single deep-reasoning tasks may stay on the higher tier — the rule targets
  breadth, not depth.

## Fleet size
- **10-15 concurrent agents maximum.** If the work needs more, batch it in
  waves and summarize between waves.
- Prefer pipelines (each item flows through its stages independently) over
  barriers that hold every agent open waiting for the slowest one.

## Caching / context discipline
- Keep each subagent's prompt narrow. A smaller starting context is multiplied
  by every turn that agent takes, so trimming it pays three ways at once.
- Delegate searching, keep the conclusion. Never let a subagent's raw file
  dumps land in the main thread — ask for `file:line` refs and findings.
- Don't re-derive what's already in context, and don't re-read a file that was
  just edited to "verify" it.
- Reuse one warm session rather than restarting: cached context is far cheaper
  to replay than to rebuild.
- Cap agent turns by giving a clear stop condition; an agent with a vague task
  keeps looping over the same expensive context.
- Long tool output belongs in a file or the scratchpad, not the transcript.

# Revnest Frontend Specific Guidelines Start -

While following everything from above, revnest frontend must respect these rules:

## State Management
- **Redux**: Use Redux Toolkit.
- **Reference**: Prefer local react states instead of global redux slices and states for new functionality, you can should the existing ones if exist.
- **API**: Use RTK Query for client components, and fetchResult()/fetchWithResult() for server components.


## Exclusions & Ignores
- **Files to Ignore**:
  - `*.scss` files (do not edit, prefer Tailwind).
  - `*.service.ts` files.
  - `src/redux/slices` (except `propertySlice.ts`).
  - Files marked "to be deleted" or "marked for delete".
  - Commented out code (read for context, and previous works).
  - Unused imports (ignore, shouldn't remove them).

#### Never specify heading elements color explicitly, unless asked to do, ignore heading colors from screenshots too

# Revnest Frontend Specific Guidelines End -
