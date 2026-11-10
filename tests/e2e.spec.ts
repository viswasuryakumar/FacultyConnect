import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const reviewDirectory = '.impeccable/review';

async function resetDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Start a fresh preview?' });
  await dialog.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByLabel('Preview role')).toHaveValue('student');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Viswa');
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.isVisible()) await dismiss.click();
}

async function switchRole(page: Page, role: 'student' | 'professor' | 'admin') {
  await page.getByLabel('Preview role').selectOption(role);
  await expect(page.getByLabel('Preview role')).toHaveValue(role);
}

async function selectFirstSlot(page: Page) {
  await expect(page.locator('.calendar-day.available').first()).toBeVisible();
  await page.locator('.calendar-day.available').first().click();
  await page.getByLabel('Available times').getByRole('button').first().click();
}

async function submitSarahMeeting(page: Page, topic: string, automatic = false) {
  await page.goto('/professors/prof-sarah');
  await page.getByRole('link', { name: 'Choose date & time' }).click();
  await selectFirstSlot(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Meeting type', { exact: false }).fill('Research feedback');
  await page.getByLabel('Discussion topic', { exact: false }).fill(topic);
  await page
    .getByLabel('Message to the professor', { exact: false })
    .fill(
      'I would like to discuss my research approach, review the results of my experiments, and agree on useful next steps.',
    );
  await page
    .getByRole('button', {
      name: automatic ? 'Book meeting' : 'Send meeting request',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/meetings$/);
  const meeting = page.getByRole('link', { name: `View details: ${topic}`, exact: true });
  await expect(meeting).toHaveCount(1);
  await expect(meeting.locator('.badge')).toHaveText(automatic ? 'confirmed' : 'pending');
  return meeting.getAttribute('href');
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual({ width: page.viewportSize()!.width, scrollWidth: page.viewportSize()!.width });
}

async function expectBookingControlsInsidePanel(page: Page) {
  const clippedControls = await page.locator('.calendar-layout').evaluate((panel) => {
    const bounds = panel.getBoundingClientRect();
    return [...panel.querySelectorAll('button, select')]
      .filter((control) => {
        const rect = control.getBoundingClientRect();
        return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
      })
      .map((control) => control.getAttribute('aria-label') || control.textContent?.trim());
  });
  expect(
    clippedControls,
    'Calendar and slot controls must fit inside their clipping panel',
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await resetDemo(page);
});

test('manual request is accepted by the professor and confirmed for the student', async ({
  page,
}) => {
  const topic = 'Browser walkthrough: evaluating a research model';
  const meetingPath = await submitSarahMeeting(page, topic);
  await page.getByRole('link', { name: `View details: ${topic}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Waiting for acceptance' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join Zoom', exact: true })).toHaveCount(0);

  await switchRole(page, 'professor');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', {
      name: 'Requests',
      exact: true,
    })
    .click();
  await page.getByRole('link', { name: `Review request: ${topic}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${meetingPath}$`));
  await expect(page.getByText(topic, { exact: true })).toBeVisible();
  await expect(page.getByText('Research feedback', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Your response is needed', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.zoom-panel')).toContainText(
    "Review the student's request, then accept or decline it below.",
  );
  await expect(page.locator('.zoom-panel')).not.toContainText('Your professor is reviewing');
  await page.getByRole('button', { name: 'Accept request', exact: true }).click();
  await expect(page.locator('.page-header .badge')).toHaveText('confirmed');

  await switchRole(page, 'student');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', {
      name: 'My Meetings',
      exact: true,
    })
    .click();
  const meeting = page.getByRole('link', { name: `View details: ${topic}`, exact: true });
  await expect(meeting).toHaveCount(1);
  await expect(meeting.locator('.badge')).toHaveText('confirmed');
  await meeting.click();
  await expect(page.getByRole('button', { name: 'Join Zoom', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Join Zoom', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('No external meeting opens');
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.reload();
  await expect(page.locator('.page-header .badge')).toHaveText('confirmed');
});

test('automatic booking confirms a new request without accepting older pending requests', async ({
  page,
}) => {
  await switchRole(page, 'professor');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', {
      name: 'Availability',
      exact: true,
    })
    .click();
  await page.getByRole('tab', { name: 'Booking rules', exact: true }).click();
  await page.getByRole('radio', { name: /Automatic booking/ }).check();
  await page.getByRole('button', { name: 'Save booking rules', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Availability saved' })).toBeVisible();
  await page.goto('/meetings/meeting-pending');
  await expect(page.locator('.page-header .badge')).toHaveText('pending');

  await switchRole(page, 'student');
  const topic = 'Browser walkthrough: automatic booking';
  await submitSarahMeeting(page, topic, true);
  await page.getByRole('link', { name: `View details: ${topic}`, exact: true }).click();
  await expect(page.locator('.page-header .badge')).toHaveText('confirmed');
  await expect(page.getByRole('button', { name: 'Join Zoom', exact: true })).toBeVisible();
});

test('availability conflict review retains the existing confirmed appointment', async ({
  page,
}) => {
  await page.goto('/meetings/meeting-next');
  const originalAppointment = await page.locator('.detail-panel .summary-line').first().innerText();
  await switchRole(page, 'professor');
  await page.goto('/availability');
  await page.getByText('One-off schedule changes (optional)', { exact: true }).click();
  await page.getByRole('button', { name: 'Add schedule change', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add schedule change', exact: true });
  const start = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  await dialog.getByLabel('Start date', { exact: true }).fill(start);
  await dialog.getByLabel('End date', { exact: true }).fill(end);
  await dialog.getByLabel('Unavailable all day', { exact: true }).check();
  await dialog.getByRole('button', { name: 'Apply schedule change', exact: true }).click();
  await page.getByRole('button', { name: 'Save availability', exact: true }).click();
  const conflicts = page.getByRole('dialog', { name: 'Review a schedule conflict' });
  await expect(conflicts).toBeVisible();
  await expect(conflicts).toContainText('Viswa');
  await conflicts.getByRole('button', { name: 'Return to schedule', exact: true }).click();
  await page.getByRole('button', { name: 'Save availability', exact: true }).click();
  await conflicts
    .getByRole('button', { name: 'Keep meetings & save other hours', exact: true })
    .click();
  await expect(conflicts).not.toBeVisible();

  await switchRole(page, 'student');
  await page.goto('/meetings/meeting-next');
  await expect(page.locator('.page-header .badge')).toHaveText('confirmed');
  await expect(page.locator('.detail-panel .summary-line').first()).toHaveText(
    originalAppointment,
    { useInnerText: true },
  );
});

test('reschedule proposal preserves the original time until the other participant accepts', async ({
  page,
}) => {
  await page.goto('/meetings/meeting-next');
  const originalAppointment = await page.locator('.detail-panel .summary-line').first().innerText();
  await page.getByRole('link', { name: 'Reschedule', exact: true }).click();
  await selectFirstSlot(page);
  await page.getByRole('button', { name: 'Send reschedule request', exact: true }).click();
  await expect(page.getByText('New time proposed', { exact: true })).toBeVisible();
  await expect(page.locator('.page-header .badge')).toHaveText('confirmed');
  await expect(page.locator('.detail-panel .summary-line').first()).toHaveText(
    originalAppointment,
    { useInnerText: true },
  );

  await switchRole(page, 'professor');
  await page.goto('/meetings/meeting-next');
  await expect(page.locator('.detail-panel .summary-line').first()).toHaveText(
    originalAppointment,
    { useInnerText: true },
  );
  await page.getByRole('button', { name: 'Accept new time', exact: true }).click();
  await expect(page.getByText('New time proposed', { exact: true })).toHaveCount(0);
  await expect(page.locator('.detail-panel .summary-line').first()).not.toHaveText(
    originalAppointment,
    { useInnerText: true },
  );
  await expect(page.locator('.page-header .badge')).toHaveText('confirmed');
});

test('connection preview keeps accounts disconnected and supports keyboard dismissal', async ({
  page,
}) => {
  await switchRole(page, 'professor');
  await page.goto('/connections');
  const connect = page.getByRole('button', { name: 'Connect Zoom', exact: true });
  await connect.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Connect Zoom', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('No Zoom account will be connected');
  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('Tab');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.activeElement === document.body || !!document.activeElement?.closest('dialog'),
        ),
      )
      .toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(connect).toBeFocused();
  await expect(page.getByText('Not connected', { exact: true })).toHaveCount(2);
});

test('student email is saved and visible to the professor, with upcoming meetings before requests', async ({
  page,
}) => {
  const email = 'viswa.preview@example.edu';
  await page.goto('/profile');
  await page.getByLabel('Student email', { exact: false }).fill(email);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Student email', { exact: false })).toHaveValue(email);

  for (const path of ['/meetings/meeting-alex', '/meetings/meeting-pending']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Meeting details', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Student email', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: email, exact: true })).toHaveCount(0);
  }
  await page.goto('/meetings/meeting-alex');
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.isVisible()) await dismiss.click();
  await mkdir(reviewDirectory, { recursive: true });
  await page.screenshot({
    path: `${reviewDirectory}/student-meeting-email-hidden.png`,
    fullPage: true,
  });

  await switchRole(page, 'professor');
  await page.goto('/meetings/meeting-next');
  const emailLink = page.getByRole('link', { name: email, exact: true });
  await expect(emailLink).toBeVisible();
  await expect(emailLink).toHaveAttribute('href', `mailto:${email}`);
  await mkdir(reviewDirectory, { recursive: true });
  await page.screenshot({ path: `${reviewDirectory}/changes-meeting-details.png`, fullPage: true });
  await page.goto('/meetings/meeting-amina');
  await expect(
    page.getByRole('heading', { name: 'Your response is needed', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'amina.hassan@example.edu', exact: true }),
  ).toHaveAttribute('href', 'mailto:amina.hassan@example.edu');
  await page.screenshot({
    path: `${reviewDirectory}/changes-professor-request.png`,
    fullPage: true,
  });

  await page.goto('/');
  const next = page.getByRole('heading', { name: 'Next after this', exact: true });
  const response = page.getByRole('heading', { name: 'Needs your response', exact: true });
  await expect(next).toBeVisible();
  await expect(response).toBeVisible();
  expect(
    await next.evaluate((element) => {
      const response = [...document.querySelectorAll('h2')].find(
        (heading) => heading.textContent === 'Needs your response',
      );
      return (
        !!response &&
        !!(element.compareDocumentPosition(response) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: `${reviewDirectory}/changes-professor-dashboard.png`,
    fullPage: true,
  });
});

test('public profiles show editable teaching subjects and a simple 30-minute booking action', async ({
  page,
}) => {
  await switchRole(page, 'professor');
  await page.goto('/profile');
  await page
    .getByLabel('Subjects taught', { exact: false })
    .fill('Machine learning, Python programming');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.getByRole('link', { name: 'Preview saved profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Subjects taught', exact: true })).toBeVisible();
  const subjects = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Subjects taught', exact: true }) });
  await expect(subjects).toContainText('Python programming');
  await expect(page.getByRole('heading', { name: 'Current research', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Schedule a conversation', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Choose date & time', exact: true })).toBeVisible();
  await switchRole(page, 'student');
  await page.goto('/professors/prof-sarah');
  await expect(subjects).toContainText('Python programming');
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.isVisible()) await dismiss.click();
  await expectNoHorizontalOverflow(page);
  await mkdir(reviewDirectory, { recursive: true });
  await page.screenshot({ path: `${reviewDirectory}/changes-profile-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/changes-profile-mobile.png`, fullPage: true });

  await switchRole(page, 'professor');
  if (await dismiss.isVisible()) await dismiss.click();
  await page.goto('/availability');
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tab', { name: 'Date changes', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Student booking preview', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('One-off schedule changes (optional)', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add schedule change', exact: true }),
  ).not.toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${reviewDirectory}/changes-availability-mobile.png`,
    fullPage: true,
  });
  await page.getByRole('tab', { name: 'Booking rules', exact: true }).click();
  await page.getByText('Advanced limits', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Booking window', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Minimum notice', exact: true })).toBeVisible();
});

test('desktop and mobile pages fit the viewport and produce review screenshots', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mkdir(reviewDirectory, { recursive: true });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/desktop.png`, fullPage: true });
  await page.goto('/professors');
  await expect(page.getByRole('heading', { name: 'Find your professor' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/directory.png`, fullPage: true });
  await page.goto('/professors/prof-sarah/book');
  await expect(page.getByRole('heading', { name: 'Choose a time' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBookingControlsInsidePanel(page);
  await page.screenshot({ path: `${reviewDirectory}/booking.png`, fullPage: true });
  await switchRole(page, 'professor');
  await page.goto('/availability');
  await expect(page.getByRole('heading', { name: 'Availability', exact: true })).toBeVisible();
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.isVisible()) await dismiss.click();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/availability.png`, fullPage: true });

  await resetDemo(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', {
      name: 'Find Professors',
      exact: true,
    })
    .click();
  await expect(page.getByRole('heading', { name: 'Find your professor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/mobile-directory.png`, fullPage: true });
  await page.goto('/professors/prof-sarah/book');
  await expect(page.getByRole('heading', { name: 'Choose a time' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBookingControlsInsidePanel(page);
  await page.screenshot({ path: `${reviewDirectory}/mobile-booking.png`, fullPage: true });
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await selectFirstSlot(page);
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  await switchRole(page, 'professor');
  await page.goto('/availability');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/mobile-availability.png`, fullPage: true });
  expect(errors).toEqual([]);
});
