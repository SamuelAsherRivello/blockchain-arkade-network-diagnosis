# AI Project Rules

## OpenSpec directory

- The canonical, tracked OpenSpec planning directory is `.openspec/`.
- Before any OpenSpec command or planning-file lookup, check `.openspec/` from the repository root. Its presence establishes the project planning home; never treat a missing plain `openspec/` directory as a missing OpenSpec project.
- The plain `openspec/` path is only a generated compatibility junction for the stock CLI. Confirm it with `Get-Item -Force openspec` when needed, but inspect, edit, and stage planning files only through `.openspec/`.
- Never create a second plain OpenSpec directory or force-add the compatibility junction.
