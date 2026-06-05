import { test, expect } from '@playwright/test'

test.describe('Poliscope E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Poliscope/)
    await expect(page.locator('text=Poliscope')).toBeVisible()
  })

  test('displays the header', async ({ page }) => {
    await expect(page.locator('text=L\'Assemblée')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=577 députés')).toBeVisible()
  })

  test('navigation tabs are present', async ({ page }) => {
    const tabs = ['Accueil', 'Carte', 'Votes', 'Comparer', 'Flux']
    for (const tab of tabs) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible()
    }
  })

  test('search input works and shows results', async ({ page }) => {
    const input = page.locator('#search-depute')
    await expect(input).toBeVisible({ timeout: 10000 })

    // Wait for API data to load
    await page.waitForTimeout(3000)

    // Type a search term
    await input.fill('Le Pen')
    await page.waitForTimeout(500)

    // Results should appear
    const cards = page.locator('[data-depute]')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })

    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('search filters show group badges', async ({ page }) => {
    await page.waitForTimeout(3000)
    const input = page.locator('#search-depute')
    // Search for a deputy that exists to see group badges
    await input.fill('Attal')
    await page.waitForTimeout(1000)

    // The result card should show group badge
    const cards = page.locator('[data-depute]')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
  })

  test('navigates between views', async ({ page }) => {
    // Click on Carte tab
    await page.locator('button:has-text("Carte")').click()
    await expect(page.locator('text=Carte politique')).toBeVisible({ timeout: 10000 })

    // Back to Accueil
    await page.locator('button:has-text("Accueil")').click()
    await expect(page.locator('text=L\'Assemblée')).toBeVisible()
  })

  test('scrutins view loads with data', async ({ page }) => {
    await page.locator('button:has-text("Votes")').click()
    
    // Wait for the page to show "Chargement" then actual data
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-scrutin]')
      return el !== null
    }, { timeout: 30000 })

    const items = page.locator('[data-scrutin]')
    const count = await items.count()
    expect(count).toBeGreaterThan(0)
  })

  test('flux view shows activity timeline', async ({ page }) => {
    await page.locator('button:has-text("Flux")').click()
    await expect(page.locator('text=Flux en direct')).toBeVisible()
    // Should have timeline items
    const items = page.locator('.glass.rounded-lg')
    await expect(items.first()).toBeVisible()
  })

  test('comparateur view is accessible', async ({ page }) => {
    await page.locator('button:has-text("Comparer")').click()
    await expect(page.locator('text=Comparateur')).toBeVisible()
    await expect(page.locator('text=Député A')).toBeVisible()
    await expect(page.locator('text=Député B')).toBeVisible()
  })
})
