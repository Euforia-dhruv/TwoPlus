---
name: find-skills
description: Helps users discover and install agent skills when they ask how to do something, request a skill for a task, or want to extend agent capabilities.
---

# Find Skills

Use this skill when a user:

- Asks how to do something that may have a dedicated skill.
- Says "find a skill for X" or asks whether a skill exists.
- Requests a specialized capability or workflow.
- Wants to search for tools, templates, or agent skills.

## Find a skill

1. Check the [skills.sh leaderboard](https://skills.sh/) for popular, relevant skills.
2. Search by a specific task or domain using:

   ```bash
   npx skills find [query] [--owner <owner>]
   ```

3. Verify the source reputation, install count, and repository quality before recommending a skill.
4. Present the skill name, purpose, source, install command, and skills.sh link.
5. Install when the user requests it:

   ```bash
   npx skills add <owner/repo@skill> -g -y
   ```

If no suitable skill exists, say so and offer to handle the task directly.
