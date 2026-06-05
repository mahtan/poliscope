import { describe, it, expect } from 'vitest'
import { getGroupInfo, formatDate, GROUPES } from '../../src/api.js'

describe('getGroupInfo', () => {
  // ── By abbreviated name ──
  it.each([
    ['RN', 'Rassemblement National'],
    ['LFI', 'LFI - NFP'],
    ['EPR', 'Ensemble pour la République'],
    ['GDR', 'GDR'],
    ['SOC', 'Socialiste - NFP'],
    ['LIOT', 'LIOT'],
    ['NI', 'Non-Inscrit'],
  ])('maps "%s" to %s', (abbr, expected) => {
    const result = getGroupInfo(null, abbr)
    expect(result.label).toBe(expected)
  })

  // ── By full name ──
  it.each([
    ['Rassemblement National', 'RN'],
    ['La France Insoumise', 'LFI'],
    ['Gauche Démocrate et Républicaine', 'GDR'],
    ['Ensemble pour la République', 'EPR'],
    ['Socialistes et apparentés', 'SOC'],
    ['Libertés, Indépendants, Outre-mer et Territoires', 'LIOT'],
    ['Non-Inscrit', 'NI'],
  ])('detects "%s" from full name', (fullName, expectedShort) => {
    const result = getGroupInfo(fullName, '')
    expect(result.short).toBe(expectedShort)
  })

  it('falls back to NI for null input', () => {
    expect(getGroupInfo(null, null).short).toBe('NI')
  })

  it('falls back to NI for empty input', () => {
    expect(getGroupInfo('', '').short).toBe('NI')
  })
})

describe('formatDate', () => {
  it('formats a valid date string in French locale', () => {
    const result = formatDate('2026-06-05')
    expect(result).toMatch(/5 juin/)
    expect(result).toMatch(/2026/)
  })

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('')
  })
})

describe('GROUPES constants', () => {
  it('has color codes for all groups', () => {
    for (const [key, val] of Object.entries(GROUPES)) {
      expect(val.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(val.short).toBeTruthy()
      expect(val.label).toBeTruthy()
    }
  })

  it('has no duplicate color codes', () => {
    const colors = Object.values(GROUPES).map((v) => v.color)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(colors.length)
  })
})
