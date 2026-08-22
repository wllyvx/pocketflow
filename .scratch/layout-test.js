const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'node_modules/.pnpm/@playwright+test@1.62.1/node_modules/@playwright/test'));

const CHROME_PATH = path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe');
const BASE_URL = 'http://localhost:4321/';

async function testLayout() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
  });

  // Mobile test (iPhone SE viewport)
  const mobilePage = await browser.newPage({
    viewport: { width: 375, height: 667 },
  });
  await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);

  // Check viewport meta tag
  const viewportMeta = await mobilePage.getAttribute('meta[name="viewport"]', 'content');
  console.log('Viewport meta:', viewportMeta);

  // Check for horizontal scroll
  const mobileScrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('Mobile horizontal overflow (px):', mobileScrollWidth);

  // Check SummaryCards layout
  const summaryCardsGrid = await mobilePage.$eval('section[aria-label="Financial summary"]', el => getComputedStyle(el).gridTemplateColumns);
  console.log('Mobile SummaryCards grid:', summaryCardsGrid);

  // Check EnvelopeProgress grid columns on mobile
  const envelopeGridCols = await mobilePage.evaluate(() => {
    const grid = document.querySelector('#envelope-grid');
    if (!grid) return 'not found';
    return getComputedStyle(grid).gridTemplateColumns || 'not set';
  });
  console.log('Mobile EnvelopeProgress grid columns:', envelopeGridCols);

  // Take mobile screenshot
  await mobilePage.screenshot({ path: path.join(__dirname, 'mobile-screenshot.png'), fullPage: true });
  console.log('Mobile screenshot saved');

  // Desktop test
  const desktopPage = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);

  const desktopScrollWidth = await desktopPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('Desktop horizontal overflow (px):', desktopScrollWidth);

  // Check SummaryCards on desktop
  const desktopSummaryGrid = await desktopPage.$eval('section[aria-label="Financial summary"]', el => getComputedStyle(el).gridTemplateColumns);
  console.log('Desktop SummaryCards grid:', desktopSummaryGrid);

  await desktopPage.screenshot({ path: path.join(__dirname, 'desktop-screenshot.png'), fullPage: true });
  console.log('Desktop screenshot saved');

  // Check specific elements for mobile
  const mobileChecks = await mobilePage.evaluate(() => {
    const results = {};

    const mobileNav = document.querySelector('nav[aria-label="Mobile navigation"]');
    results.mobileNavVisible = mobileNav ? getComputedStyle(mobileNav).display !== 'none' : false;

    const fab = document.querySelector('button[aria-label="Add transaction"]');
    results.fabVisible = fab ? getComputedStyle(fab).display !== 'none' : false;

    const hamburger = document.querySelector('.mobile-sidebar-open');
    results.hamburgerVisible = hamburger ? getComputedStyle(hamburger).display !== 'none' : false;

    // Check Add button full width on mobile
    const filtersDiv = document.querySelector('#transactions-filters');
    const addBtn = filtersDiv ? filtersDiv.nextElementSibling : null;
    if (addBtn) {
      results.addButtonWidth = addBtn.style.width || getComputedStyle(addBtn).width;
    }

    // Check TransactionsPanel header flex direction on mobile
    const txHeader = document.querySelector('#transactions-filters').parentElement;
    results.txHeaderFlexDir = txHeader ? getComputedStyle(txHeader).flexDirection : 'not found';

    return results;
  });
  console.log('Mobile element checks:', JSON.stringify(mobileChecks, null, 2));

  // Desktop element checks
  const desktopChecks = await desktopPage.evaluate(() => {
    const results = {};

    const sidebar = document.querySelector('[data-mobile-sidebar]');
    results.sidebarVisible = sidebar ? getComputedStyle(sidebar).display !== 'none' : false;

    const mobileNav = document.querySelector('nav[aria-label="Mobile navigation"]');
    results.mobileNavHidden = mobileNav ? getComputedStyle(mobileNav).display === 'none' : false;

    const summaryCols = getComputedStyle(document.querySelector('section[aria-label="Financial summary"]')).gridTemplateColumns;
    results.summaryCols = summaryCols;

    const txHeader = document.querySelector('#transactions-filters').parentElement;
    results.txHeaderFlexDir = getComputedStyle(txHeader).flexDirection;

    return results;
  });
  console.log('Desktop element checks:', JSON.stringify(desktopChecks, null, 2));

  await browser.close();
}

testLayout().catch(console.error);
