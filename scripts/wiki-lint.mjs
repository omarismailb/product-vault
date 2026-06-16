#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

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
  'index',
  'log',
])

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return entry.isFile() && entry.name.endsWith('.md') ? [full] : []
  })
}

function parseFrontmatter(file) {
  const text = fs.readFileSync(file, 'utf8')
  if (!text.startsWith('---\n')) {
    return { data: {}, error: 'missing frontmatter' }
  }
  const end = text.indexOf('\n---', 4)
  if (end === -1) {
    return { data: {}, error: 'unterminated frontmatter' }
  }
  const raw = text.slice(4, end).trim()
  const data = {}
  for (const line of raw.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match) continue
    const [, key, value] = match
    data[key] = value.replace(/^['"]|['"]$/g, '')
  }
  return { data, error: null }
}

const files = walk(wikiRoot)
const ids = new Map()
const errors = []

for (const file of files) {
  const rel = path.relative(root, file)
  const { data, error } = parseFrontmatter(file)
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
  }
}

if (errors.length > 0) {
  console.error(`wiki-lint failed with ${errors.length} issue(s):`)
  for (const issue of errors) console.error(`- ${issue}`)
  process.exit(1)
}

console.log(`wiki-lint passed: ${files.length} wiki file(s), ${ids.size} stable id(s).`)

