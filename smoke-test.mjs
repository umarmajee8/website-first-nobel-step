import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const errors = [];
const submittedApplications = [];
const vc = new (class {
  constructor() {}
})();

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    // jsdom lacks tailwind + innerText
    window.tailwind = { config: {} };
    Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
      get() { return this.textContent; },
      set(v) { this.textContent = v; },
      configurable: true,
    });
    // stub fetch for API calls
    window.fetch = async (url, opts) => {
      const body = opts && opts.body ? JSON.parse(opts.body) : {};
      if (String(url).includes('/api/send-otp')) {
        return { ok: true, json: async () => ({ success: true, hash: 'testhash' }) };
      }
      if (String(url).includes('/api/verify-otp')) {
        const ok = body.otp === '123456';
        return { ok, json: async () => (ok ? { success: true } : { success: false, error: 'Invalid' }) };
      }
      if (String(url).includes('/api/submit-membership')) {
        submittedApplications.push(body);
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: true, json: async () => ({ success: true }) };
    };
    window.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  },
});

const { window } = dom;
const { document } = window;

const $ = (id) => document.getElementById(id);
const visible = (id) => {
  const el = $(id);
  return el && !el.classList.contains('hidden');
};
const assert = (cond, msg) => {
  if (cond) console.log('PASS:', msg);
  else { console.log('FAIL:', msg); process.exitCode = 1; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await sleep(300); // DOMContentLoaded + init

assert(typeof window.openForm === 'function', 'openForm exposed');
assert(typeof window.selectPlan === 'function', 'selectPlan exposed');
assert(typeof window.nextStep === 'function', 'nextStep exposed');

// Project affiliation reads as one balanced statement, not a tiny stacked label.
const projectAffiliation = $('project-affiliation');
const affiliationText = projectAffiliation?.querySelector('span');
assert(projectAffiliation !== null && visible('project-affiliation'), 'project affiliation badge is visible');
assert(projectAffiliation?.closest('#hero') === $('hero'), 'project affiliation appears in the hero section');
assert(projectAffiliation?.textContent.replace(/\s+/g, ' ').trim() === 'Part of UN33B GROUP OF COMPANIES', 'project affiliation shows the requested company name');
assert(projectAffiliation?.querySelector('i')?.getAttribute('aria-hidden') === 'true', 'decorative affiliation icon is hidden from assistive technology');
assert(affiliationText?.classList.contains('text-[13px]') && affiliationText.classList.contains('sm:text-sm'), 'Part of and the company name share a larger, readable font size');
assert(affiliationText?.querySelector('span')?.classList.contains('font-semibold') && !affiliationText.classList.contains('flex-col'), 'Part of is emphasized inline instead of stacked above the company name');

// Header/nav sanity
assert($('membership') !== null, 'membership section exists');
assert($('automation') !== null, 'automation section exists');
assert($('internship') === null, 'internship section removed');
assert($('e-training-banner') !== null && visible('e-training-banner'), 'full-width E-Training section is visible below the header');
assert(html.includes('@keyframes e-training-drop-in'), 'E-Training section has a drop-in animation');
assert($('e-training-apply') !== null, 'E-Training apply button exists in the banner');
assert($('e-training-apply').textContent.includes('Enrollment Currently Open for E-Training'), 'banner shows the enrollment announcement');
assert($('e-training-apply').classList.contains('sf-pro-font'), 'enrollment announcement uses the SF Pro font stack');
assert($('e-training-banner-close') !== null, 'white close control exists on the banner');
const enrollmentDeadline = $('e-training-enrollment-deadline');
assert(enrollmentDeadline !== null && !visible('e-training-enrollment-deadline'), 'enrollment deadline starts hidden until E-Training is chosen');
assert(enrollmentDeadline?.textContent.replace(/\s+/g, ' ').trim() === 'Last date to enroll: 20 October', 'enrollment deadline shows the requested date');
assert($('form-modal-header').nextElementSibling === enrollmentDeadline, 'enrollment deadline sits at the beginning of the form, directly below the header');
assert(enrollmentDeadline?.querySelector('i')?.getAttribute('aria-hidden') === 'true', 'decorative deadline icon is hidden from assistive technology');

// e-Training opens the personal-details form and skips plan/payment steps
$('e-training-banner').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(50);
assert(visible('modal-overlay'), 'clicking anywhere on the E-Training section opens the application form');
assert(!html.includes('e-training-drawer'), 'no full-width drawer styling remains in the stylesheet');
assert(!$('modal-overlay').classList.contains('e-training-drawer'), 'E-Training form is not a full-width drawer');
assert($('modal-overlay').classList.contains('items-center') && $('modal-overlay').classList.contains('justify-center'), 'E-Training form opens as a centred modal');
assert($('modal-content').classList.contains('max-w-2xl'), 'E-Training form uses the same centred card width as the membership form');
assert(!$('modal-content').classList.contains('e-training-drawer-content'), 'E-Training card does not stretch edge to edge');
assert($('form-modal-close').getAttribute('aria-label') === 'Close application form', 'close control is available in the panel header');
assert(visible('step-2'), 'e-Training starts on the name/details section');
assert($('form-title').textContent.includes('E-Training'), 'e-Training form has the right title');
assert(visible('e-training-enrollment-deadline'), 'enrollment deadline is visible immediately when E-Training opens from the banner');
assert($('btn-back').classList.contains('hidden'), 'first e-Training step has no plan-selection back step');
assert($('step-1-indicator').parentElement.classList.contains('hidden'), 'plan-selection progress step is skipped');
assert($('step-4-indicator').parentElement.classList.contains('hidden'), 'payment progress step is skipped');

$('input-fullname').value = 'Training Applicant';
$('input-email').value = 'training@example.com';
$('input-whatsapp').value = '923001234567';
window.validateStep2();
await window.nextStep();
await sleep(50);
assert(visible('step-3'), 'e-Training continues to email verification');

// OTP clipboard, keyboard suggestions, and autofill must fill six separate boxes.
const otpBoxes = Array.from(document.querySelectorAll('#otp-boxes .otp-box'));
assert(otpBoxes.length === 6, 'email verification has six OTP boxes');
assert(otpBoxes.every(box => box.inputMode === 'numeric' && box.maxLength !== 1), 'OTP inputs show a numeric keyboard without truncating a pasted code');
assert(otpBoxes[0].autocomplete === 'one-time-code', 'first OTP box supports full-code autofill');
assert(otpBoxes.every(box => box.getAttribute('aria-label')), 'OTP digits have accessible labels');
const checkOTPCode = (code, message) => {
  const expected = [...code, ...Array(6 - code.length).fill('')];
  assert(otpBoxes.every((box, index) => box.value === expected[index]) && $('input-otp').value === code, message);
  assert($('btn-next').disabled === (code.length !== 6), `${message}: Continue requires a complete code`);
};
const pasteOTPCode = (index, text) => {
  const event = new window.Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: type => ['text/plain', 'text'].includes(type) ? text : '' } });
  otpBoxes[index].focus();
  otpBoxes[index].dispatchEvent(event);
  return event;
};
const inputOTPCode = (index, value, data = null, inputType = 'insertReplacementText') => {
  otpBoxes[index].focus();
  otpBoxes[index].value = value;
  otpBoxes[index].dispatchEvent(new window.InputEvent('input', { bubbles: true, data, inputType }));
};
for (const [index, text, expected, label] of [
  [0, '123456', '123456', 'full OTP clipboard paste fills all six boxes'],
  [5, '012345', '012345', 'full paste into the last box preserves a leading zero'],
  [2, ' 123-456\n', '123456', 'clipboard formatting is removed before distributing digits'],
  [0, '123456789', '123456', 'overlong clipboard input is limited to six digits'],
]) {
  assert(pasteOTPCode(index, text).defaultPrevented, `${label}: native paste is handled`);
  checkOTPCode(expected, label);
}
pasteOTPCode(0, 'No digits');
checkOTPCode('123456', 'non-numeric paste leaves the existing code intact');
pasteOTPCode(0, '98');
checkOTPCode('98', 'short paste clears stale trailing digits');
pasteOTPCode(2, '76');
checkOTPCode('9876', 'partial paste starts at the selected box and preserves the prefix');
assert(document.activeElement === otpBoxes[4], 'partial paste focuses the next empty box');
pasteOTPCode(0, '123456');
pasteOTPCode(1, '9');
checkOTPCode('193456', 'single-digit paste replaces only the selected digit');
inputOTPCode(4, '123456', '123456');
checkOTPCode('123456', 'mobile multi-digit input without a paste event fills all six boxes');
inputOTPCode(3, '654321');
checkOTPCode('654321', 'autofill without event data distributes the entire code');
inputOTPCode(2, '19', '9', 'insertText');
checkOTPCode('659321', 'typing beside an existing digit replaces it without overwriting adjacent boxes');
const beforeInput = new window.InputEvent('beforeinput', { bubbles: true, cancelable: true, data: '123 456', inputType: 'insertText' });
otpBoxes[3].dispatchEvent(beforeInput);
assert(beforeInput.defaultPrevented, 'keyboard clipboard suggestions are handled before native insertion');
checkOTPCode('123456', 'beforeinput distributes a complete code instead of keeping one digit');
const nonCancelableInput = new window.InputEvent('beforeinput', { bubbles: true, data: '654321', inputType: 'insertReplacementText' });
otpBoxes[0].dispatchEvent(nonCancelableInput);
inputOTPCode(0, '654321');
checkOTPCode('654321', 'non-cancelable autofill uses the input-event fallback');
const nativePasteFallback = new window.Event('paste', { bubbles: true, cancelable: true });
otpBoxes[0].dispatchEvent(nativePasteFallback);
assert(!nativePasteFallback.defaultPrevented, 'missing clipboard data is allowed to fall back to native input');
inputOTPCode(0, '123456');
checkOTPCode('123456', 'native clipboard fallback still fills all six boxes');
inputOTPCode(1, '2x', 'x', 'insertText');
checkOTPCode('123456', 'non-numeric typing is ignored without changing a valid code');
assert(document.activeElement === otpBoxes[1], 'ignored non-numeric typing does not advance focus');

// Keep ordinary typing, deletion, and keyboard navigation working.
otpBoxes.forEach(box => { box.value = ''; });
otpBoxes[0].dispatchEvent(new window.Event('input', { bubbles: true }));
'123456'.split('').forEach((digit, index) => inputOTPCode(index, digit, digit, 'insertText'));
checkOTPCode('123456', 'manual digit-by-digit typing still builds a complete OTP');
inputOTPCode(5, '', null, 'deleteContentBackward');
checkOTPCode('12345', 'deleting a digit disables Continue');
const backspace = new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
otpBoxes[5].dispatchEvent(backspace);
checkOTPCode('1234', 'backspace from an empty box clears the previous digit');
assert(backspace.defaultPrevented && document.activeElement === otpBoxes[4], 'backspace focuses the previous OTP box');
otpBoxes[4].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
assert(document.activeElement === otpBoxes[3], 'left arrow moves to the previous OTP box');
otpBoxes[3].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
assert(document.activeElement === otpBoxes[4], 'right arrow moves to the next OTP box');
pasteOTPCode(0, '123456');
await window.nextStep();
assert(visible('step-5'), 'verified e-Training application goes directly to review');
assert(!visible('step-4'), 'e-Training never shows the payment section');

$('input-terms').checked = true;
$('input-terms').dispatchEvent(new window.Event('change', { bubbles: true }));
window.validateStep5();
window.nextStep();
await sleep(2100);
assert(visible('success-view'), 'e-Training application can be submitted without payment');
assert($('success-message').textContent.includes('contact you shortly'), 'e-Training success message does not mention payment');
assert(submittedApplications[0]?.planId === 'e-training', 'e-Training is recorded as its own application type');
assert(submittedApplications[0]?.paymentProof === '', 'e-Training submits with no payment proof');
assert(submittedApplications[0]?.paymentMethod === '', 'e-Training does not require a payment method');
window.forceCloseForm();
await sleep(350);
$('e-training-banner-close').click();
assert(!visible('e-training-banner'), 'banner close control dismisses the E-Training section');
assert(!visible('modal-overlay'), 'banner close control does not open the form');

// Open form
window.openForm();
await sleep(50);
assert(visible('modal-overlay'), 'modal opens');
assert(visible('step-1'), 'step 1 visible');
assert(visible('section-entrepreneur'), 'entrepreneur section visible');
assert(!visible('e-training-enrollment-deadline'), 'enrollment deadline stays hidden in the membership form');
assert(document.getElementById('section-students') === null, 'old packages removed');

// Select entrepreneur
window.selectPlan('entrepreneur');
await sleep(20);
const card = $('plan-entrepreneur');
assert(card.classList.contains('border-pakistan-green'), 'plan card highlighted');
assert(visible('package-details-container'), 'package details shown');
assert($('package-details-title').textContent.includes('Entrepreneur'), 'details title correct');

// E-Training is offered inside the form as well, right below the Entrepreneur card
assert($('plan-e-training') !== null, 'E-Training option exists inside the membership form');
assert($('plan-e-training').classList.contains('plan-card'), 'E-Training option uses the same plan-card styling as Entrepreneur');
assert($('plan-e-training').getAttribute('onclick') === "selectPlan('e-training')", 'E-Training option selects the e-training pathway');
assert($('section-entrepreneur').contains($('plan-e-training')), 'E-Training option sits in the plan-selection step');
assert(!/application fee|no fee|free/i.test($('plan-e-training').textContent), 'E-Training card makes no fee claim');
window.selectPlan('e-training');
await sleep(20);
assert(!/application fee|no fee|free/i.test($('package-details-list').textContent), 'E-Training details make no fee claim');
assert(/Golden Certificate/i.test($('package-details-list').textContent), 'E-Training details list the Golden Certificate');
assert(/Experience Letter/i.test($('package-details-list').textContent), 'E-Training details list the Experience Letter');
assert(/Real projects/i.test($('package-details-list').textContent), 'E-Training details list real projects');
assert($('plan-e-training').classList.contains('border-pakistan-green'), 'E-Training card highlights when picked');
assert(!card.classList.contains('border-pakistan-green'), 'Entrepreneur card deselects when E-Training is picked');
assert(visible('package-details-container'), 'E-Training details shown');
assert($('package-details-title').textContent.includes('E-Training'), 'details title switches to E-Training');
assert($('form-title').textContent.includes('E-Training'), 'form title switches to the E-Training application');
assert(visible('e-training-enrollment-deadline'), 'selecting E-Training inside the form immediately shows the enrollment deadline');
assert(!$('modal-overlay').classList.contains('e-training-drawer'), 'in-form E-Training keeps the normal modal frame');
assert(visible('step-1'), 'in-form E-Training keeps the plan-selection step');
assert(!$('step-1-indicator').parentElement.classList.contains('hidden'), 'plan step stays in the in-form E-Training progress');
assert($('step-4-indicator').parentElement.classList.contains('hidden'), 'payment step is skipped for in-form E-Training');

window.nextStep();
await sleep(20);
assert(visible('step-2'), 'in-form E-Training continues to the details step');
assert(!$('btn-back').classList.contains('hidden'), 'in-form E-Training can step back to the plan list');
window.prevStep();
await sleep(20);
assert(visible('step-1'), 'back from details returns to the plan list');

// Switch back to Entrepreneur for the membership flow
window.selectPlan('entrepreneur');
await sleep(20);
assert(!$('modal-overlay').classList.contains('e-training-drawer'), 'membership flow has no e-Training drawer');
assert($('form-title').textContent.includes('Membership'), 'title returns to the Membership Application');
assert(!visible('e-training-enrollment-deadline'), 'switching back to Entrepreneur hides the E-Training deadline');

// Step 1 -> 2
window.nextStep();
await sleep(20);
assert(visible('step-2'), 'step 2 visible');

// invalid first
$('input-fullname').value = 'ab';
window.validateStep2();
window.nextStep();
await sleep(20);
assert(visible('step-2'), 'step 2 blocks invalid data');

// valid data
$('input-fullname').value = 'Umar Majeed';
$('input-email').value = 'umar@example.com';
$('input-whatsapp').value = '923001234567';
window.validateStep2();
window.nextStep();
await sleep(60);
assert(visible('step-3'), 'step 3 (OTP) visible');

// OTP wrong then right
const boxes = document.querySelectorAll('#otp-boxes .otp-box');
// fill otp boxes if present
if (boxes.length >= 6) {
  '123456'.split('').forEach((ch, i) => {
    boxes[i].value = ch;
    boxes[i].dispatchEvent(new window.Event('input', { bubbles: true }));
  });
} else if ($('input-otp')) {
  $('input-otp').value = '123456';
}
await sleep(30);
window.nextStep();
await sleep(80);
assert(visible('step-4'), 'step 4 (payment) visible after valid OTP');

// Payment: upload proof via state (simulate)
// handleProofUpload expects an event with file; simulate by setting state directly if exposed is hard.
// Instead, use the file input change with a fake File
const fileInput = $('proof-file-input');
if (fileInput) {
  const file = new window.File([new Uint8Array([137, 80, 78, 71])], 'proof.png', { type: 'image/png' });
  Object.defineProperty(fileInput, 'files', { value: [file] });
  window.handleProofUpload({ target: fileInput });
  await sleep(200);
}
window.validateStep4();
window.nextStep();
await sleep(30);
assert(visible('step-5'), 'step 5 (review) visible');

// Review shows data
assert($('review-name') && $('review-name').textContent.includes('Umar Majeed'), 'review shows name');

// Accept terms and submit
const terms = $('input-terms');
terms.checked = true;
terms.dispatchEvent(new window.Event('change', { bubbles: true }));
window.validateStep5();
window.nextStep(); // should trigger submitForm on step 5
await sleep(2600);
const successVisible = visible('success-view');
assert(successVisible, 'success view shown after submit');

// Indicators show 1..5
const ind5 = $('step-5-indicator');
assert(ind5 && ind5.textContent.trim() === '5', 'indicator 5 shows number 5 (no 4-4 bug)');

// close form
window.forceCloseForm();
await sleep(350);
assert(!visible('modal-overlay'), 'modal closes');

// Full in-form E-Training application: no payment step, submits as e-training
window.openForm();
await sleep(50);
assert(visible('step-1'), 'Apply Now opens the plan list again');
window.selectPlan('e-training');
await sleep(20);
window.nextStep();
await sleep(20);
assert(visible('step-2'), 'in-form E-Training form starts with the details step after the plan list');
$('input-fullname').value = 'In Form Trainee';
$('input-email').value = 'inform@example.com';
$('input-whatsapp').value = '923007654321';
window.validateStep2();
await window.nextStep();
await sleep(60);
assert(visible('step-3'), 'in-form E-Training asks for email verification');
'123456'.split('').forEach((char, index) => {
  const box = document.querySelectorAll('#otp-boxes .otp-box')[index];
  box.value = char;
  box.dispatchEvent(new window.Event('input', { bubbles: true }));
});
await window.nextStep();
await sleep(60);
assert(visible('step-5'), 'in-form E-Training goes straight to review');
assert(!visible('step-4'), 'in-form E-Training never shows the payment section');
assert($('step-5-indicator').parentElement.classList.contains('hidden') === false, 'review step is part of the in-form E-Training progress');
$('input-terms').checked = true;
$('input-terms').dispatchEvent(new window.Event('change', { bubbles: true }));
window.validateStep5();
window.nextStep();
await sleep(2100);
const inFormETraining = submittedApplications[submittedApplications.length - 1];
assert(visible('success-view'), 'in-form E-Training application submits successfully');
assert(inFormETraining?.applicationType === 'e-training' && inFormETraining?.planId === 'e-training', 'in-form E-Training submits as an e-training application');
assert(inFormETraining?.paymentProof === '' && inFormETraining?.paymentMethod === '', 'in-form E-Training needs no payment proof or method');
window.forceCloseForm();
await sleep(350);
assert(!visible('modal-overlay'), 'modal closes after the in-form E-Training application');

if (errors.length) {
  console.log('RUNTIME ERRORS:', errors);
  process.exitCode = 1;
} else {
  console.log('NO RUNTIME ERRORS');
}
console.log('SMOKE TEST DONE');
window.close();
process.exit(process.exitCode || 0);
