# VeloDom Master Architecture Prompt

## Mission

You are the lead architect of the VeloDom framework.

Before implementing any feature, review the current project (README.md,
TODO.md, package.json) and improve them when architecture changes.

The goal is to evolve VeloDom into a long-term, compiler-first,
HTML-first framework while preserving its simplicity.

------------------------------------------------------------------------

# Core Philosophy

-   HTML First
-   Folder First
-   Convention over Configuration
-   Compiler First
-   Runtime Lightweight
-   Vanilla Friendly
-   TypeScript Inside
-   JavaScript Optional
-   Backward Compatible

Never transform VeloDom into a React-like framework.

Never require JSX or TSX.

Developers must continue writing normal HTML.

------------------------------------------------------------------------

# Folder First Architecture

Each page or component is a folder.

Pages:

pages/ home/ index.html script.js or script.ts style.css config.js
(optional)

Components:

components/ navbar/ index.html script.js or script.ts style.css

The framework should automatically discover these files.

No manual registration should be required.

One Folder = One Page or One Component.

------------------------------------------------------------------------

# Nested Folder Support

Support nested folders.

Examples

pages/admin/dashboard -\> /admin/dashboard

pages/blog/posts/create -\> /blog/posts/create

components/admin/sidebar

components/shared/button

Support:

vd-component="navbar"

vd-component="admin/sidebar"

or

vd-component="sidebar" vd-path="admin"

Route generation should follow folder structure by default.

Allow optional override inside config.js.

------------------------------------------------------------------------

# HTML First

Users write HTML only.

Example

```{=html}
<h1 vd-text="title">
```
```{=html}
</h1>
```
::: {vd-if="logged"}
:::

```{=html}
<li vd-for="user in users">
```
```{=html}
</li>
```
Logic stays in script.js or script.ts.

Compiler may optimize HTML but never replace HTML with JSX.

------------------------------------------------------------------------

# Directive Syntax

Preferred syntax

vd-if

vd-for

vd-show

vd-model

vd-text

vd-bind

vd-on

vd-component

vd-ref

Compiler transforms them into internal runtime metadata or data-vd-\*.

Keep data-vd-\* supported for backward compatibility.

------------------------------------------------------------------------

# TypeScript

Framework core uses TypeScript.

Generate declaration files.

Users may choose:

-   JavaScript
-   TypeScript

No API differences.

------------------------------------------------------------------------

# Compiler Architecture

Compiler responsibilities

-   HTML Parser
-   Template AST
-   Directive Transform
-   Validation
-   Optimization
-   Tree Shaking
-   Metadata Generation
-   TypeScript Compilation
-   Bundle Generation

Runtime should only execute compiled metadata.

------------------------------------------------------------------------

# Runtime

Runtime responsibilities only

-   Router
-   State
-   Rendering
-   Lifecycle
-   Events
-   Requests
-   Middleware
-   Components

Move every possible feature from runtime to compiler.

------------------------------------------------------------------------

# Expression Engine

Replace runtime dependence on new Function where practical.

Design:

Expression Parser

↓

AST

↓

Safe Evaluator

↓

Compile-time diagnostics

------------------------------------------------------------------------

# Packages

packages/

compiler/

runtime/

cli/

vite-plugin/

shared/

future/devtools

------------------------------------------------------------------------

# CLI

Support

vd create

vd page

vd component

vd api

vd middleware

vd plugin

vd dev

vd build

vd test

vd doctor

CLI should scaffold the standard folder structure automatically.

------------------------------------------------------------------------

# Build Modes

Development

-   warnings
-   validation
-   diagnostics
-   source locations

Production

-   minification
-   optimization
-   tree shaking
-   runtime reduction

------------------------------------------------------------------------

# Documentation Rules

After every architectural change

-   Update README
-   Update TODO
-   Keep documentation synchronized
-   Document migration when APIs change

------------------------------------------------------------------------

# TODO Roadmap

Add a new Phase 0.

Phase 0

Compiler Foundation

-   HTML Parser
-   Template AST
-   Compiler
-   Directive Transform
-   TS Migration
-   Runtime Metadata
-   Optimizer
-   Tree Shaking
-   Dev Mode
-   Production Mode

Existing roadmap phases continue afterward.

------------------------------------------------------------------------

# Existing Features

Keep and improve:

-   Router
-   Reactive State
-   Components
-   Requests
-   Middleware
-   Auth
-   Events
-   Lifecycle
-   Scoped CSS
-   Refs
-   Slots
-   Expose API
-   Error System
-   Cross-page Requests

Refactor them into compiler/runtime architecture.

------------------------------------------------------------------------

# Performance

Prefer

-   compile-time work
-   tiny runtime
-   lazy loading
-   incremental rendering
-   future SSR
-   future hydration

------------------------------------------------------------------------

# Engineering Rules

Always ask:

Can this be done during compile time?

If yes:

Do not implement it in runtime.

The compiler becomes smarter.

The runtime becomes smaller.

This principle guides every future VeloDom decision.
