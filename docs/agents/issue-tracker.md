# Issue tracker: Local markdown

Issues and specs for this repo live as markdown files under `.scratch/<feature>/` in the repo itself.

## Conventions

- **File structure**: `.scratch/<feature-slug>/issue.md` or `.scratch/<feature-slug>/<number>.md` for multiple related issues.
- **Create an issue**: write a markdown file with frontmatter (title, labels, status) and a body. Example:

  ```markdown
  ---
  title: Add dark mode toggle
  labels: [needs-triage]
  status: open
  ---
  
  ## Description
  
  Users want a dark mode toggle in settings.
  
  ## Acceptance criteria
  
  - [ ] Toggle persists across sessions
  - [ ] Applies to all pages
  ```

- **Read an issue**: open the file with your editor or `cat`.
- **List issues**: `rg --files .scratch/` or `find .scratch/ -name '*.md'`, then parse frontmatter.
- **Update an issue**: edit the file (change `status`, add comments as new sections, update labels in frontmatter).
- **Close an issue**: change `status: open` to `status: closed` in frontmatter, or move the file to `.scratch/_archive/`.

## When a skill says "publish to the issue tracker"

Create a new markdown file under `.scratch/<feature>/issue.md`.

## When a skill says "fetch the relevant ticket"

Read the markdown file at `.scratch/<feature>/issue.md` or the path the user provides.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single file with **child** issues as separate files.

- **Map**: `.scratch/<exploration-slug>/map.md`, holding the Notes / Decisions-so-far / Fog body. Label: `wayfinder:map`.
- **Child ticket**: a separate file `.scratch/<exploration-slug>/<child-slug>.md`. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Add `claimed_by: <name>` in frontmatter once claimed.
- **Blocking**: add `blocked_by: [<child-slug>, <child-slug>]` array in the child's frontmatter. A ticket is unblocked when all referenced files have `status: closed`.
- **Frontier query**: list all child files under the map's directory, drop any with open blockers (check `blocked_by` files' status) or a `claimed_by` field; first in alphabetical order wins.
- **Claim**: add `claimed_by: <your-name>` to the child's frontmatter, the session's first write.
- **Resolve**: append the answer to the child file's body, change `status: closed`, then add a context pointer (summary + link to the child file) to the map's Decisions-so-far section.
