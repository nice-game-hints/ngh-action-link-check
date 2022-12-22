import {validateLinks} from '../src/ngh-link-validator'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'

test('validate links', async () => {
  const validationResults = await validateLinks(
    path.join(process.cwd(), '__tests__', 'assets', 'metadata-links'),
    '*.md'
  )
  expect(validationResults.length).toBe(6)
  const invalidResults = validationResults
    .filter(res => !res.valid)
    .map(res => res.filePath)
  expect(invalidResults.length).toBe(1)
  expect(invalidResults[0]).toBe('does-not-exist.md')
})

test('validate in text single word links', async () => {
  const validationResults = await validateLinks(
    path.join(process.cwd(), '__tests__', 'assets', 'in-text-links'),
    '*.md'
  )
  expect(validationResults.length).toBe(4)
  const invalidResults = validationResults
    .filter(res => !res.valid)
    .map(res => res.filePath)
  expect(invalidResults.length).toBe(1)
  expect(invalidResults[0]).toBe('link-in-text.md')
})
