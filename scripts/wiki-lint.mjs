#!/usr/bin/env node

import path from 'node:path'
import { walk, readText, parseUnit, asList } from './lib/wiki.mjs'

const root = process.cwd()
const wikiRoot = path.join(root, 'wiki')
const allowedTypes = new Set([
  'actor',
  'job',
  'story',
  'acceptance-criterion',
  'rule',
  'journey',
  'capability',
  'outcome',
  'non-goal',
  'assumption',
  'glossary',
  'decision',
  'design-system',
  'overview',
  'index',
  'log',
])
const allowedStatuses = new Set([
  'draft',
  'proposed',
  'active',
  'retired',
  'superseded',
  'rejected',
])

const files = walk(wikiRoot, (file) => file.endsWith('.md'))
const ids = new Map()
const errors = []

for (const file of files) {
  const rel = path.relative(root, file)
  const { data, error } = parseUnit(readText(file))
  if (error) {
    errors.push(`${rel}: ${error}`)
    continue
  }
  for (const key of ['id', 'type', 'status', 'updated']) {
    if (!data[key]) errors.push(`${rel}: missing ${key}`)
  }
  if (data.type && !allowedTypes.has(data.type)) {
    errors.push(`${rel}: unknown type "${data.type}"`)
  }
  if (data.status && !allowedStatuses.has(data.status)) {
    errors.push(
      `${rel}: unknown status "${data.status}" (allowed: ${[...allowedStatuses].join(', ')}). ` +
        `A typo like "Active" silently drops the unit from enforcement.`,
    )
  }
  if (data.updated && !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) {
    errors.push(`${rel}: updated must be YYYY-MM-DD`)
  }
  if (data.id) {
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(data.id)) {
      errors.push(`${rel}: id must be lowercase dot-or-dash format`)
    }
    if (ids.has(data.id)) {
      errors.push(`${rel}: duplicate id also used by ${ids.get(data.id)}`)
    }
    ids.set(data.id, rel)
    // When a unit declares aliases, the list must contain the unit's id. A
    // [[type.slug]] link resolves by alias for human readers, so the alias must
    // equal the id. Units without aliases are left alone (backward-compatible).
    if (data.aliases !== undefined && !asList(data.aliases).includes(data.id)) {
      errors.push(
        `${rel}: aliases ${JSON.stringify(asList(data.aliases))} must contain the unit id "${data.id}". ` +
          `A [[type.slug]] link resolves by alias for human readers, so the alias must equal the id.`,
      )
    }
  }
}

if (errors.length > 0) {
  console.error(`wiki-lint failed with ${errors.length} issue(s):`)
  for (const issue of errors) console.error(`- ${issue}`)
  process.exit(1)
}

console.log(`wiki-lint passed: ${files.length} wiki file(s), ${ids.size} stable id(s).`)
