import { mkdir, readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const reviewDirectory = '.impeccable/review';
const meetingPath = '/meetings/meeting-next?tab=notes';

async function resetDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Start a fresh preview?' })
    .getByRole('button', { name: 'Reset demo', exact: true })
    .click();
  await expect(page.getByLabel('Preview role')).toHaveValue('student');
  await dismissToast(page);
}

async function dismissToast(page: Page) {
  const dismiss = page.getByRole('button', { name: 'Dismiss notification' });
  if (await dismiss.isVisible()) await dismiss.click();
}

async function switchRole(page: Page, role: 'student' | 'professor' | 'admin') {
  await page.getByLabel('Preview role').selectOption(role);
  await expect(page.getByLabel('Preview role')).toHaveValue(role);
}

async function openNotes(page: Page, path = meetingPath) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: 'Shared notes', exact: true })).toBeVisible();
}

async function shareNote(page: Page, body: string) {
  await page.getByLabel('Note to share', { exact: false }).fill(body);
  await page.getByRole('button', { name: 'Send note', exact: true }).click();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveValue('');
}

function notePost(page: Page, body: string) {
  return page
    .locator('article.meeting-note')
    .filter({ has: page.getByText(body, { exact: true }) });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  // Seed relative fixture dates on Friday, then view the Monday appointment in progress.
  // setFixedTime controls Date while keeping the UI's ordinary timers running.
  await page.clock.setFixedTime(new Date('2026-11-06T18:00:00Z'));
  await resetDemo(page);
  await page.clock.setFixedTime(new Date('2026-11-09T18:05:00Z'));
});

test('drafts stay private and shared notes persist across roles, replies and notification links', async ({
  page,
}) => {
  const studentNote =
    'Notes walkthrough: I will compare precision and recall before our next call.';
  const professorReply =
    'Notes walkthrough reply: Please add a confusion matrix and explain the trade-offs.';
  await openNotes(page);
  await page.getByLabel('Note to share', { exact: false }).fill(studentNote);
  await page.reload();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveValue(studentNote);

  await switchRole(page, 'professor');
  await openNotes(page);
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveValue('');
  await expect(page.getByText(studentNote, { exact: true })).toHaveCount(0);

  await switchRole(page, 'student');
  await openNotes(page);
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveValue(studentNote);
  await page.getByRole('button', { name: 'Send note', exact: true }).click();
  await expect(page.getByText(studentNote, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveValue('');

  await switchRole(page, 'professor');
  await page.goto('/notifications');
  const noteNotification = page
    .locator('.notification-row')
    .filter({ hasText: 'Viswa Surya' })
    .filter({ hasText: /note/i })
    .first();
  await noteNotification.getByRole('button', { name: 'View', exact: true }).click();
  await expect(page).toHaveURL(/\/meetings\/meeting-next\?tab=notes$/);
  await expect(page.getByText(studentNote, { exact: true })).toBeVisible();
  await expect(
    notePost(page, studentNote).getByRole('button', { name: 'Edit note', exact: true }),
  ).toHaveCount(0);
  await expect(
    notePost(page, studentNote).getByRole('button', { name: 'Delete note', exact: true }),
  ).toHaveCount(0);
  await shareNote(page, professorReply);

  await switchRole(page, 'student');
  await page.goto('/notes');
  await expect(page.getByRole('heading', { name: 'Meeting notes', exact: true })).toBeVisible();
  await page.getByLabel('Search meeting notes').fill('trade-offs');
  const threadLink = page.locator('a[href="/meetings/meeting-next?tab=notes"]');
  await expect(threadLink).toHaveCount(1);
  await threadLink.click();
  await expect(page.getByText(professorReply, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(studentNote, { exact: true })).toBeVisible();
  await expect(page.getByText(professorReply, { exact: true })).toBeVisible();

  await openNotes(page, '/meetings/meeting-alex?tab=notes');
  await expect(page.getByText(studentNote, { exact: true })).toHaveCount(0);
  await expect(page.getByText(professorReply, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
});

test('authors can edit and delete their own notes while cancelled threads keep read-only history', async ({
  page,
}) => {
  const original = 'Notes ownership walkthrough: First draft of the shared next step.';
  const edited = 'Notes ownership walkthrough: Revised next step agreed with the professor.';
  const retained =
    'Notes history walkthrough: Keep this resource list with the cancelled appointment.';
  await openNotes(page);
  await shareNote(page, original);
  await notePost(page, original).getByRole('button', { name: 'Edit note', exact: true }).click();
  await page.getByLabel('Edit note', { exact: false }).fill(edited);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText(original, { exact: true })).toHaveCount(0);
  await expect(notePost(page, edited)).toContainText(/edited/i);

  await switchRole(page, 'professor');
  await openNotes(page);
  await expect(page.getByText(edited, { exact: true })).toBeVisible();
  await expect(
    notePost(page, edited).getByRole('button', { name: 'Edit note', exact: true }),
  ).toHaveCount(0);
  await expect(
    notePost(page, edited).getByRole('button', { name: 'Delete note', exact: true }),
  ).toHaveCount(0);

  await switchRole(page, 'student');
  await openNotes(page);
  await notePost(page, edited).getByRole('button', { name: 'Delete note', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Delete this note?', exact: true })
    .getByRole('button', { name: 'Delete note', exact: true })
    .click();
  await expect(page.getByText(edited, { exact: true })).toHaveCount(0);
  await shareNote(page, retained);

  await page.getByRole('tab', { name: 'Details', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel meeting', exact: true }).click();
  await page
    .getByLabel('Reason for cancellation', { exact: false })
    .fill('The appointment is no longer needed.');
  await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await page.getByRole('tab', { name: /^Notes/ }).click();
  await expect(page.getByText(retained, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send note', exact: true })).toHaveCount(0);
  await expect(
    notePost(page, retained).getByRole('button', { name: 'Edit note', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(retained, { exact: true })).toBeVisible();
});

test('chat opens only during the meeting and becomes read-only at its exact end', async ({
  page,
}) => {
  const privateNote = 'Participant access walkthrough: Only Viswa and Sarah should see this note.';
  await page.clock.setFixedTime(new Date('2026-11-09T17:55:00Z'));
  await openNotes(page);
  await expect(page.getByText('Chat opens when the meeting starts', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send note', exact: true })).toHaveCount(0);

  await page.clock.setFixedTime(new Date('2026-11-09T18:05:00Z'));
  await expect(page.getByLabel('Note to share', { exact: false })).toBeVisible();
  await shareNote(page, privateNote);
  await page
    .getByLabel('Note to share', { exact: false })
    .fill('Unsent draft at the end of the meeting.');
  await page.clock.setFixedTime(new Date('2026-11-09T18:30:00Z'));
  await expect(
    page.getByText('This meeting has ended. Messages are read-only.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send note', exact: true })).toHaveCount(0);
  await expect(
    notePost(page, privateNote).getByRole('button', { name: 'Edit note', exact: true }),
  ).toHaveCount(0);
  await expect(
    notePost(page, privateNote).getByRole('button', { name: 'Delete note', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(privateNote, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(privateNote, { exact: true })).toBeVisible();
  await expect(
    page.getByText('Unsent draft at the end of the meeting.', { exact: true }),
  ).toHaveCount(0);

  await mkdir(reviewDirectory, { recursive: true });
  await dismissToast(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/notes-history-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/notes-history-mobile.png`, fullPage: true });

  await openNotes(page, '/meetings/meeting-completed?tab=notes');
  const historicalNote = await page.locator('.meeting-note .note-body').first().innerText();
  await expect(page.getByText(historicalNote, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send note', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit note', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(historicalNote, { exact: true })).toBeVisible();

  await page.goto('/meetings/meeting-daniel?tab=notes');
  await expect(page.getByText(/This meeting belongs to another preview identity/)).toBeVisible();
  await expect(page.getByText(privateNote, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await page.goto('/meetings/meeting-pending?tab=notes');
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send note', exact: true })).toHaveCount(0);

  await switchRole(page, 'admin');
  await page.goto(meetingPath);
  await expect(page.getByText(privateNote, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await page.goto('/notes');
  await expect(page.getByText(privateNote, { exact: true })).toHaveCount(0);
});

test('notes threads and the Notes menu remain readable on desktop and mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mkdir(reviewDirectory, { recursive: true });
  await openNotes(page);
  await shareNote(
    page,
    'Layout walkthrough: Review the validation results, list the next experiment, and bring the comparison to our next meeting.',
  );
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notes', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/facultyconnect-notes-.*\.txt$/);
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  expect(await readFile(downloadedPath!, 'utf8')).toContain(
    'Layout walkthrough: Review the validation results',
  );
  await page.getByRole('button', { name: 'About automatic summaries', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'About automatic summaries', exact: true }),
  ).toContainText('does not listen to Zoom');
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await dismissToast(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/notes-thread-desktop.png`, fullPage: true });
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Notes', exact: true })
    .click();
  await expect(page).toHaveURL(/\/notes$/);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/notes-index-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${reviewDirectory}/notes-index-mobile.png`, fullPage: true });
  await page.locator('a[href="/meetings/meeting-next?tab=notes"]').click();
  await expectNoHorizontalOverflow(page);
  await expect(page.getByLabel('Note to share', { exact: false })).toBeVisible();
  await page.screenshot({ path: `${reviewDirectory}/notes-thread-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Notes', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Meeting notes', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('automatic conversation records stay separate from written notes and clearly label examples', async ({
  page,
}) => {
  const humanNote =
    'Conversation separation walkthrough: This written note must not become an automatic transcript.';
  const providerRequests: string[] = [];
  page.on('request', (request) => {
    if (/https:\/\/(?:api\.)?zoom\.(?:us|com)(?:\/|$)/.test(request.url()))
      providerRequests.push(request.url());
  });
  await mkdir(reviewDirectory, { recursive: true });
  await openNotes(page);
  await shareNote(page, humanNote);
  await page.clock.setFixedTime(new Date('2026-11-09T18:35:00Z'));
  await page.getByRole('tab', { name: 'Conversation record', exact: true }).click();
  await expect(page).toHaveURL(/\/meetings\/meeting-next\?tab=conversation$/);
  await expect(
    page.getByRole('heading', { name: 'Automatic conversation record', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Not connected', { exact: true })).toBeVisible();
  await expect(page.getByText(humanNote, { exact: true })).not.toBeVisible();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await dismissToast(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${reviewDirectory}/conversation-disconnected-desktop.png`,
    fullPage: true,
  });

  await page.getByRole('button', { name: 'View example format', exact: true }).click();
  const example = page.getByText('Illustrative example — not recorded from this meeting', {
    exact: true,
  });
  await expect(example).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Example recap', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Example transcript', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Not connected', { exact: true })).toBeVisible();
  await expect(page.getByText(humanNote, { exact: true })).not.toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${reviewDirectory}/conversation-example-desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${reviewDirectory}/conversation-example-mobile.png`,
    fullPage: true,
  });

  await page.reload();
  await expect(page.getByText('Not connected', { exact: true })).toBeVisible();
  await expect(example).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'View example format', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${reviewDirectory}/conversation-disconnected-mobile.png`,
    fullPage: true,
  });

  const conversationTab = page.getByRole('tab', { name: 'Conversation record', exact: true });
  await conversationTab.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: /^Notes/ })).toBeFocused();
  await expect(page.getByRole('tab', { name: /^Notes/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(humanNote, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Note to share', { exact: false })).toHaveCount(0);
  await expect(
    page.getByText('Illustrative example — not recorded from this meeting', { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Details', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(conversationTab).toBeFocused();
  await expect(conversationTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Not connected', { exact: true })).toBeVisible();

  await page.goto('/meetings/meeting-daniel?tab=conversation');
  await expect(page.getByText(/This meeting belongs to another preview identity/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Automatic conversation record', exact: true }),
  ).toHaveCount(0);
  await switchRole(page, 'admin');
  await page.goto('/meetings/meeting-next?tab=conversation');
  await expect(page.getByRole('tab', { name: 'Conversation record', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Automatic conversation record', exact: true }),
  ).toHaveCount(0);
  expect(providerRequests).toEqual([]);
});
