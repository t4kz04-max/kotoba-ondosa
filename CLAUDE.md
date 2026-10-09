\# CLAUDE.md



\## Project



Project name: kotoba-ondosa



Japanese title: 言葉の温度差



Subtitle: 同じ言葉なのに、同じ意味じゃない。



This project is an interactive web application for a Japanese junior-high-school programming contest.



The application helps users discover differences in how people interpret ambiguous expressions such as 「すぐ」「ちょっと待って」「あとで」.



The central experience is:



1\. Enter your interpretation of an ambiguous expression.

2\. Compare it with another person's interpretation.

3\. Visualize similarities and differences.

4\. Convert the ambiguous expression into a concrete, mutually confirmed statement.



The application must not judge whose interpretation is correct.



\## Development Roles



\* Claude Code is the primary implementation agent.

\* Gemini Canvas will be used later to explore UI/UX prototypes.

\* Codex may be used for independent code review when necessary.

\* The human developer makes final product decisions.



\## Technology Stack



\* React

\* TypeScript

\* Vite

\* CSS

\* SVG

\* Vitest

\* Git



Use additional dependencies only when they provide a clear benefit.



Do not introduce Three.js, a database, authentication, or external AI APIs without explicit approval.



\## Engineering Principles



1\. Keep the architecture simple and maintainable.

2\. Separate domain logic from React components.

3\. Use TypeScript strict mode.

4\. Prefer pure functions for calculations.

5\. Write tests for important algorithms.

6\. Keep the application responsive.

7\. Prioritize usability and accessibility.

8\. Avoid unnecessary dependencies.

9\. Do not fabricate research results or user statistics.

10\. Clearly label fictional demonstration data.

11\. Do not claim a feature works unless it has been tested.

12\. Do not add features outside the current phase without approval.



\## Product Principles



The product is not a generic survey application.



Its core value is helping people discover and resolve differences in interpretation.



The main user journey is:



Discovery → Understanding → Clarification



The application should be usable by junior-high-school students and visitors with no technical knowledge.



The experience should be understandable within approximately 30 seconds.



\## UI/UX Policy



During Phase 0, do not build the final UI.



During Phase 3, create a functional MVP with basic styling.



During Phase 4, the human developer will use Gemini Canvas to explore UI/UX prototypes.



During Phase 5, implement the selected UI/UX design without breaking the existing application logic.



\## Workflow Rules



Before making major changes:



1\. Read the relevant documentation.

2\. Explain the planned changes briefly.

3\. Implement only the current phase.

4\. Run available checks.

5\. Report completed work and remaining issues.



Do not automatically begin the next phase.



\## Git Policy



Use Git to track development.



Create a meaningful commit at the end of each completed phase.



Never overwrite or discard existing user work without permission.



Do not push code to a remote repository without explicit approval.



\## Phase 0



The current task is Phase 0: project initialization.



Read docs/PROJECT\_OVERVIEW.md, docs/ROADMAP.md, and docs/PHASE0\_TASK.md.



Complete only Phase 0.



Do not implement the application features yet.



\## Completion Reporting



At the end of each phase, report:



\* Files created or changed

\* Commands executed

\* Test results

\* Build results

\* Git commit status

\* Known issues

\* Recommended next step



Respond in Japanese.



