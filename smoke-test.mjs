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
const automationPoints = Array.from(document.querySelectorAll('#automation ul li')).map(li => li.textContent.replace(/\s+/g, ' ').trim());
assert(automationPoints.length === 3, 'Automation Solutions displays exactly 3 points');
assert(automationPoints[0] === 'Autonomous Multi Agent AI Orchestration (AI Workforce)', 'Automation point 1 matches');
assert(automationPoints[1] === 'Custom LLM Fine Tuning & Proprietary Knowledge Bases', 'Automation point 2 matches');
assert(automationPoints[2] === 'Enterprise Workflow & API Ecosystem Automation', 'Automation point 3 matches');
assert($('internship') === null, 'internship section removed');
assert(!/e-?training/i.test(html), 'no E-Training content remains anywhere on the page');
assert($('e-training-banner') === null, 'E-Training banner removed');
assert($('e-training-enrollment-deadline') === null, 'E-Training enrollment deadline removed');
assert($('plan-e-training') === null, 'E-Training plan option removed from the form');
assert(typeof window.dismissETrainingBanner === 'undefined', 'E-Training banner dismiss handler removed');

// Membership opens on plan selection, then details, then email verification
window.openForm();
await sleep(50);
assert(visible('modal-overlay'), 'Apply Now opens the application form');
assert($('modal-overlay').classList.contains('items-center') && $('modal-overlay').classList.contains('justify-center'), 'membership form opens as a centred modal');
assert($('modal-content').classList.contains('max-w-2xl'), 'membership form uses the centred card width');
assert($('form-modal-close').getAttribute('aria-label') === 'Close application form', 'close control is available in the panel header');
assert(visible('step-1'), 'membership starts on plan selection');
assert($('form-title').textContent.includes('Membership'), 'membership form has the right title');
assert($('btn-back').classList.contains('hidden'), 'first membership step has no back step');
assert(!$('step-1-indicator').parentElement.classList.contains('hidden'), 'plan-selection progress step is part of the flow');
assert(!$('step-4-indicator').parentElement.classList.contains('hidden'), 'payment progress step is part of the flow');

window.selectPlan('entrepreneur');
await sleep(20);
window.nextStep();
await sleep(20);
assert(visible('step-2'), 'membership continues to the name/details section');

$('input-fullname').value = 'Membership Applicant';
$('input-email').value = 'membership@example.com';
$('input-whatsapp').value = '923001234567';
window.validateStep2();
await window.nextStep();
await sleep(50);
assert(visible('step-3'), 'membership continues to email verification');

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
await sleep(50);
assert(visible('step-4'), 'verified membership application continues to the payment section');
assert(!visible('step-5'), 'membership does not skip the payment section');

// Payment: upload proof, then review
const firstFlowFileInput = $('proof-file-input');
if (firstFlowFileInput) {
  const file = new window.File([new Uint8Array([137, 80, 78, 71])], 'proof.png', { type: 'image/png' });
  Object.defineProperty(firstFlowFileInput, 'files', { value: [file], configurable: true });
  window.handleProofUpload({ target: firstFlowFileInput });
  await sleep(200);
}
window.validateStep4();
window.nextStep();
await sleep(30);
assert(visible('step-5'), 'membership continues to review after payment proof');

$('input-terms').checked = true;
$('input-terms').dispatchEvent(new window.Event('change', { bubbles: true }));
window.validateStep5();
window.nextStep();
await sleep(2100);
assert(visible('success-view'), 'membership application can be submitted after payment');
assert($('success-message').textContent.includes('verifying your payment'), 'membership success message mentions payment verification');
assert(submittedApplications[0]?.applicationType === 'membership', 'application is recorded as a membership application');
assert(submittedApplications[0]?.planId === 'entrepreneur', 'entrepreneur plan is recorded on the application');
assert(submittedApplications[0]?.paymentProof !== '', 'membership submits with payment proof');
assert(submittedApplications[0]?.paymentMethod === 'faysalbank', 'membership submits with a payment method');
window.forceCloseForm();
await sleep(350);
assert(!visible('modal-overlay'), 'modal closes after the membership application');

// Open form
window.openForm();
await sleep(50);
assert(visible('modal-overlay'), 'modal opens');
assert(visible('step-1'), 'step 1 visible');
assert(visible('section-entrepreneur'), 'entrepreneur section visible');
assert(document.getElementById('section-students') === null, 'old packages removed');

// Select entrepreneur
window.selectPlan('entrepreneur');
await sleep(20);
const card = $('plan-entrepreneur');
assert(card.classList.contains('border-pakistan-green'), 'plan card highlighted');
assert(visible('package-details-container'), 'package details shown');
assert($('package-details-title').textContent.includes('Entrepreneur'), 'details title correct');

// Three Entrepreneur plans are offered with distinct icons and expected pricing
const planCards = Array.from(document.querySelectorAll('#section-entrepreneur .plan-card'));
assert(planCards.length === 3, 'three Entrepreneur plan cards are offered');
assert($('plan-entrepreneur')?.textContent.includes('PKR 49,999'), 'first plan price is PKR 49,999');
assert($('plan-startup-launch')?.textContent.includes('PKR 399,000'), 'second plan (Startup Launch Pad) price is PKR 399,000');
assert($('plan-biz-transformation')?.textContent.includes('PKR 599,000'), 'third plan (Business Transformation Pro) price is PKR 599,000');

const planIconClasses = planCards.map((el) => {
  const icon = el.querySelector('.icon-box i');
  return icon ? Array.from(icon.classList).find((c) => c.startsWith('fa-') && c !== 'fa-solid') : null;
});
assert(planIconClasses.every(Boolean), 'every Entrepreneur plan card has a FontAwesome icon');
assert(new Set(planIconClasses).size === planCards.length, 'all Entrepreneur plan icons (including first two plans) are distinct');

window.selectPlan('startup-launch');
await sleep(20);
assert($('plan-startup-launch').classList.contains('border-pakistan-green'), 'Startup Launch Pad card highlights on selection');
assert($('package-details-title').textContent.includes('Startup Launch Pad'), 'Startup Launch Pad details title correct');

window.selectPlan('biz-transformation');
await sleep(20);
assert($('plan-biz-transformation').classList.contains('border-pakistan-green'), 'Business Transformation Pro card highlights on selection');
assert($('package-details-title').textContent.includes('Business Transformation Pro'), 'Business Transformation Pro details title correct');

window.selectPlan('entrepreneur');
await sleep(20);
assert(!$('step-4-indicator').parentElement.classList.contains('hidden'), 'payment step is part of the membership progress');

window.nextStep();
await sleep(20);
assert(visible('step-2'), 'membership continues to the details step');
assert(!$('btn-back').classList.contains('hidden'), 'membership can step back to the plan list');
window.prevStep();
await sleep(20);
assert(visible('step-1'), 'back from details returns to the plan list');

window.selectPlan('entrepreneur');
await sleep(20);
assert($('form-title').textContent.includes('Membership'), 'title stays on the Membership Application');

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
assert($('payment-amount-display')?.textContent.includes('PKR 49,999'), 'step 4 shows PKR 49,999 for Entrepreneur plan');
window.selectPlan('startup-launch');
assert($('payment-amount-display')?.textContent.trim() === 'PKR 399,000', 'step 4 shows PKR 399,000 for Startup Launch Pad');
window.selectPlan('biz-transformation');
assert($('payment-amount-display')?.textContent.trim() === 'PKR 599,000', 'step 4 shows PKR 599,000 for Business Transformation Pro');
window.selectPlan('entrepreneur');

// Payment: upload proof via state (simulate)
// handleProofUpload expects an event with file; simulate by setting state directly if exposed is hard.
// Instead, use the file input change with a fake File
const fileInput = $('proof-file-input');
if (fileInput) {
  const badFile = new window.File([new Uint8Array([65, 66, 67])], 'notes.txt', { type: 'text/plain' });
  Object.defineProperty(fileInput, 'files', { value: [badFile], configurable: true });
  window.handleProofUpload({ target: fileInput });
  assert(visible('form-error-banner'), 'non-image receipt file triggers validation error');

  const file = new window.File([new Uint8Array([137, 80, 78, 71])], 'proof.png', { type: 'image/png' });
  Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
  window.handleProofUpload({ target: fileInput });
  await sleep(200);
}
window.validateStep4();
window.nextStep();
await sleep(30);
assert(visible('step-5'), 'step 5 (review) visible');

// Review shows data & legal links open in new tab
assert($('review-name') && $('review-name').textContent.includes('Umar Majeed'), 'review shows name');
assert($('review-plan') && $('review-plan').textContent.includes('Entrepreneur — PKR 49,999'), 'review shows selected plan and price');
const step5Links = Array.from(document.querySelectorAll('#step-5 a'));
assert(step5Links.length === 2 && step5Links.every(a => a.getAttribute('target') === '_blank'), 'step 5 legal links open in a new tab so progress is preserved');

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

// close form and verify full UI reset
window.forceCloseForm();
await sleep(350);
assert(!visible('modal-overlay'), 'modal closes');
assert($('proof-file-name')?.textContent.trim() === 'No file selected', 'receipt filename resets after closing form');
assert($('proof-preview')?.classList.contains('hidden'), 'receipt preview resets to hidden after closing form');
assert(Array.from(document.querySelectorAll('#otp-boxes .otp-box')).every(b => !b.classList.contains('border-green-500') && b.value === ''), 'OTP boxes reset cleanly after closing form');

// Unsaved input on step 1 still prompts before discarding
window.openForm();
await sleep(50);
$('input-fullname').value = 'Draft Applicant';
window.attemptCloseForm();
assert(visible('exit-confirm'), 'unsaved input triggers exit confirmation even on step 1');
window.forceCloseForm();
await sleep(350);
assert(submittedApplications.every(application => application.applicationType === 'membership'), 'every submitted application is a membership application');

if (errors.length) {
  console.log('RUNTIME ERRORS:', errors);
  process.exitCode = 1;
} else {
  console.log('NO RUNTIME ERRORS');
}
console.log('SMOKE TEST DONE');
window.close();
process.exit(process.exitCode || 0);
