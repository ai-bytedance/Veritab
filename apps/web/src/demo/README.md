# Temporary prototype boundary

This directory contains the remaining local fixtures and `localStorage` adapters used only by modules that have not yet moved to the NestJS API.

Production-connected requirements, defects and test-case flows do not use these fixtures. Remove each fixture together with its last consumer as the project-space, reporting, configuration and integration modules are migrated; do not add new production behavior here.
