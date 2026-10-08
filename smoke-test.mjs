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

// e-Training opens the personal-details form and skips plan/payment steps
$('e-training-banner').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(50);
assert(visible('modal-overlay'), 'clicking anywhere on the E-Training section opens the application form');
assert($('modal-overlay').classList.contains('e-training-drawer'), 'e-Training form opens below the header');
assert($('modal-content').classList.contains('e-training-drawer-content'), 'e-Training form spans the header width');
assert($('form-modal-close').getAttribute('aria-label') === 'Close application form', 'close control is available in the panel header');
assert(visible('step-2'), 'e-Training starts on the name/details section');
assert($('form-title').textContent.includes('E-Training'), 'e-Training form has the right title');
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
'123456'.split('').forEach((char, index) => {
  const box = document.querySelectorAll('#otp-boxes .otp-box')[index];
  box.value = char;
  box.dispatchEvent(new window.Event('input', { bubbles: true }));
});
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
window.selectPlan('e-training');
await sleep(20);
assert($('plan-e-training').classList.contains('border-pakistan-green'), 'E-Training card highlights when picked');
assert(!card.classList.contains('border-pakistan-green'), 'Entrepreneur card deselects when E-Training is picked');
assert(visible('package-details-container'), 'E-Training details shown');
assert($('package-details-title').textContent.includes('E-Training'), 'details title switches to E-Training');
assert($('form-title').textContent.includes('E-Training'), 'form title switches to the E-Training application');
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
const boxes = document.querySelectorAll('#step-3 input[maxlength="1"]');
const otpInputs = boxes.length ? boxes : [ $('input-otp') ].filter(Boolean);
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
