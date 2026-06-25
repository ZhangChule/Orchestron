# Design Context Pack

- Change: `virtual-machining-thickness-error-field-semantics`
- Phase: design
- Mode: manual fallback because Comet shell scripts are not executable in the current Windows session.
- Canonical OpenSpec artifacts:
  - `openspec/changes/virtual-machining-thickness-error-field-semantics/proposal.md`
  - `openspec/changes/virtual-machining-thickness-error-field-semantics/design.md`
  - `openspec/changes/virtual-machining-thickness-error-field-semantics/tasks.md`
  - `openspec/changes/virtual-machining-thickness-error-field-semantics/manual-verification.md`

## Source Summary

This change focuses on virtual machining wall-thickness error field semantics.

Confirmed constraints:

- Do not modify Unity Build.
- Do not modify the verified `StartMachiningJob` payload contract except changing which semantic error value feeds `points[].error`.
- Do not change the core wall-error solver.
- Keep backend wall-error computation logic intact.
- Treat current backend `points[].error` as `execution_surface_error_field`.
- Convert to `design_surface_error_field` before Unity payload.
- Correct formula: `execution_radial_depth_field[key_point] = current_thickness_field[key_point] - execution_surface_thickness`.

Main design question for this phase:

- How should matrix-valued `execution_radial_depth_field` be consumed while the current backend API accepts scalar `process.radial_depth`?
