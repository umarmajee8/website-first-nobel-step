import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import PDFDocument from 'pdfkit';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Sheets API setup
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  // Remove surrounding quotes if user accidentally pasted them
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  // Handle literal \n strings
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // API endpoint to submit form data
  app.post('/api/submit-membership', async (req, res) => {
    try {
      if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        return res.status(500).json({ success: false, error: 'Server configuration error: Missing Google Sheets credentials in Environment Variables.' });
      }

      const { fullName, cnic, email, whatsapp, planId, institute, degree, businessName, industry, experience, targetCountry } = req.body;

      console.log('Submitting to Sheet ID:', process.env.GOOGLE_SHEET_ID);
      const values = [[new Date().toISOString(), fullName, cnic, email, whatsapp, planId, institute || '', degree || '', businessName || '', industry || '', experience || '', targetCountry || '']];
      console.log('Values to append:', values);

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Sheet1!A:L',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      });
      console.log('Data successfully appended to Google Sheets.');

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error submitting to Google Sheets:', error);
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to submit data to Google Sheets';
      res.status(500).json({ success: false, error: `Google Sheets Error: ${errorMessage}` });
    }
  });

  // API endpoint to download terms and conditions
  app.get('/api/download-terms', (req, res) => {
    try {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=terms_and_conditions.pdf');
      doc.pipe(res);
      doc.fontSize(12).text(`TERMS AND CONDITIONS
First Noble Step (Private) Limited
Welcome to the official website of First Noble Step (Private) Limited (“Company”, “We”, “Our”, or “Us”).
These Terms and Conditions ("Terms") govern your access to and use of our website, services, platforms, products, and digital resources (collectively referred to as the “Website” or “Services”).
By accessing or using this Website, you agree to be legally bound by these Terms. If you do not agree with any part of these Terms, you must immediately stop using the Website.

1. Company Information
Company Name: First Noble Step (Private) Limited
Registered Jurisdiction: Pakistan
Business Nature: Business Consulting, Corporate Advisory, and Strategic Business Services
The Website is operated by First Noble Step (Private) Limited to provide business services, consulting solutions, corporate information, and related resources.

2. Acceptance of Terms
By accessing the Website you confirm that:
• You are at least 18 years old or accessing under legal supervision.
• You have the legal capacity to enter binding agreements.
• You agree to comply with all applicable laws and regulations.
• You accept these Terms fully and without limitation.

3. Scope of Services
The Company may provide but is not limited to:
• Business consultancy
• Startup advisory
• Strategic business planning
• Corporate advisory services
• Corporate training
• Business networking opportunities
• Research and business insights
• Online educational resources
• Digital content and reports
The Company reserves the right to add, modify, suspend, or discontinue services at any time without notice.

4. Website Use
You agree to use the Website only for lawful purposes.
You must not:
• Use the website for illegal activities
• Attempt to hack, damage, or disrupt the website
• Upload malicious software or viruses
• Attempt unauthorized access to systems
• Copy or steal intellectual property
• Misrepresent identity
• Conduct fraudulent activities
Violation may result in:
• Immediate termination of access
• Legal action
• Financial damages claims

5. Intellectual Property Rights
All content on the Website including:
• Text
• Graphics
• Logos
• Icons
• Designs
• Videos
• Images
• Business frameworks
• Reports
• Educational materials
• Databases
• Software
are the exclusive intellectual property of First Noble Step (Private) Limited unless otherwise stated.
Users may not reproduce, distribute, sell, modify, publish, or commercially exploit any content without written permission.

6. User Accounts
Some services may require registration.
Users agree to:
• Provide accurate information
• Maintain confidentiality of login credentials
• Notify the company of unauthorized use
• Accept responsibility for account activities
The Company may suspend or terminate accounts at its sole discretion.

7. Payments and Fees
Certain services may require payment.
Users agree that:
• Fees will be clearly communicated
• Payments are non-refundable unless stated otherwise
• The Company may revise pricing at any time
Failure to pay may result in service suspension.
Payment Policy and Accepted Payment Methods
All payments for services, subscriptions, consultations, or any other offerings provided by First Noble Step (Private) Limited must strictly follow the payment procedures defined by the Company.
Official Payment Channels
Payments will only be accepted through the following authorized methods:
• Online transfer to the official bank account of First Noble Step (Private) Limited
• Cross Cheque in the name of First Noble Step (Private) Limited
• Pay Order issued in the name of First Noble Step (Private) Limited
• Bank deposit through official bank challan
• Cash payment at the official Head Office of the Company
Any payment made to personal accounts, agents, third-party accounts, or accounts not officially registered under the name of First Noble Step (Private) Limited will not be recognized or accepted by the Company.
The Company shall not be responsible for any payments made to unauthorized accounts or individuals.
Online Payment Requirement
All online payments must be transferred directly to the official bank account of First Noble Step (Private) Limited.
Clients must ensure that:
• The account title matches the official company name
• The payment reference is clearly mentioned
• The payment receipt is submitted through the official communication channel.
Payment Confirmation Policy
Payments will only be considered valid and confirmed after the Company issues an official payment confirmation email or receipt from its authorized communication channels.
Submission of:
• Screenshots
• Edited receipts
• Altered payment slips
• AI-generated payment confirmations
• Fake transaction proofs
will not be accepted, processed, or entertained under any circumstances.
The Company reserves the right to verify every transaction before confirming the payment.
Fraud Prevention Policy
To prevent fraud and financial misconduct:
• Any fake payment claim may result in permanent service suspension.
• The Company may block the user account immediately.
• The Company may also take legal action where applicable.
Cash Payment Procedure
If a client wishes to make a cash payment, the following procedures must be followed:
Option 1 — Bank Deposit
The client must deposit the payment using an official bank challan form in any branch of Faysal Bank Limited within Pakistan.
The challan must clearly mention:
Account Title: First Noble Step (Private) Limited
Payments deposited under any other account title will not be accepted.
Option 2 — Head Office Payment
Clients may also visit the Head Office of First Noble Step (Private) Limited to make a cash payment directly.
In such cases:
• The client will receive an official company voucher or receipt
• The voucher will serve as the only valid proof of payment
Responsibility of the Client
Clients are fully responsible for ensuring that:
• Payments are sent to the correct official company account
• Payment details are accurate
• Proof of payment is genuine
The Company shall not be responsible for losses arising from incorrect payments made by the client.
Right to Reject Payments
First Noble Step (Private) Limited reserves the right to reject, suspend, or cancel any transaction that appears suspicious, unauthorized, or non-compliant with these payment policies.

8. Investment and Financial Disclaimer
The Company may provide business advisory and strategic guidance, however:
• We do not guarantee funding or investment.
• We do not guarantee business success.
• We do not provide licensed financial brokerage services unless specifically stated.
All decisions made by users based on our advice are their own responsibility.
Authorized Business Activities and Restrictions
Principal Line of Business
The principal line of business of First Noble Step (Private) Limited shall be to carry on the business of rendering consultancy services to:
• Government institutions
• Donor agencies
• International organizations
• Individuals
• Firms and partnerships
• Companies and corporate bodies
• Trusts and foundations
• Non-Governmental Organizations (NGOs)
• Associations and other lawful entities
The Company shall provide consultancy and advisory services in areas including but not limited to:
• Strategic Planning
• Project Management
• Institutional Development
• Capacity Building
• Organizational Strategy
• Business Planning
• Advisory and related consultancy services
The Company may also provide ancillary or supporting services that are necessary or beneficial to the above-mentioned consultancy activities.
General Business Authorization
Except for the businesses specifically restricted in Clause 3 below, the Company may engage in any lawful business activity and shall be authorized to undertake all necessary actions, agreements, operations, and arrangements that are incidental or ancillary to its principal consultancy business.
Restricted Business Activities
Notwithstanding anything stated in the above clauses, nothing contained herein shall be construed as empowering First Noble Step (Private) Limited to directly or indirectly undertake, engage in, or operate in any of the following businesses unless specifically licensed or authorized under applicable law:
• Banking Business
• Non-Banking Finance Company (NBFC) activities including:
o Asset Management Services
o Leasing Services
o Investment Finance Services
o Investment Advisory Services
o REIT Management Services
o Housing Finance Services
o Private Equity Fund Management
o Venture Capital Fund Management
o Discounting Services
o Pension Fund Scheme Business
o Micro-Financing Services
The Company shall also not engage in:
• Corporate Restructuring Company activities
• Insurance Business
• Modaraba Management Company operations
• Stock Brokerage services
• Forex or currency trading services
• Clearing House operations
• Securities and Futures Advisory
• Commodity Exchange operations
• Managing Agency business
• Security Guard or Private Security Services
or any other business which requires a special license, regulatory approval, or is restricted under any law for the time being in force or as may be specified by the relevant regulatory authority or commission.
Compliance Undertaking
The Company hereby undertakes that it shall not:
(a) Engage in any business mentioned in the restricted activities above.
(b) Conduct or participate in any unlawful business operation.
(c) Operate or promote Multi-Level Marketing (MLM), pyramid schemes, or similar commission-based recruitment structures under the name of the Company.

Misrepresentation and Unauthorized Representation
The Company strictly prohibits any individual, agent, representative, third party, or external entity from misrepresenting the business scope of First Noble Step (Private) Limited.
If any person:
• Claims services outside the authorized scope of the Company
• Provides misleading consultancy
• Publishes false information
• Circulates unauthorized social media posts, advertisements, or videos
• Claims affiliation with the Company without authorization
such actions shall be considered unauthorized and fraudulent representation.
Reporting Unauthorized Activities
If any client, individual, or organization encounters:
• A fake representative
• A fraudulent agent
• Misleading information
• False consultancy services
• Unauthorized advertisements, social media posts, or videos claiming association with the Company
they are requested to immediately report such activity to the Company via email:
support@firstnoblestep.com
Limitation of Liability for Unauthorized Information
First Noble Step (Private) Limited shall not be held liable for any loss, damage, misunderstanding, or consequences resulting from misinformation, false advice, or unauthorized consultancy provided by individuals or entities that are not officially authorized by the Company.
Clients are strongly advised to verify all information and communications through the official channels of the Company before relying upon them.

No Guarantee of Investment, Funding, or Business Success
First Noble Step (Private) Limited provides professional consultancy, strategic advisory, and business support services. However, the Company does not guarantee any specific results, including but not limited to:
• Investment approvals
• Funding commitments
• Financial returns
• Business growth
• Market success
• Government approvals
• Partnership agreements
• Business profitability
All advice, recommendations, reports, strategies, projections, financial models, and guidance provided by the Company are based on professional analysis, available data, and industry practices, but they should not be interpreted as guarantees or assurances of success.
Clients acknowledge and agree that:
• Final decisions remain solely the responsibility of the client.
• Market conditions, regulatory requirements, financial circumstances, and third-party decisions may affect outcomes beyond the Company’s control.
• The Company shall not be held liable for any business losses, missed opportunities, financial losses, or unsuccessful investment outcomes arising from decisions made by the client.
Engaging the services of First Noble Step (Private) Limited means the client understands that consultancy services provide strategic guidance and professional support only, and do not guarantee funding, investment, or commercial success.
Client Responsibility and Due Diligence
All clients engaging with First Noble Step (Private) Limited acknowledge that they remain fully responsible for conducting their own due diligence before making any business, financial, or investment decision.
The Company strongly advises clients to:
• Conduct independent research and verification
• Consult qualified legal, financial, or tax professionals when necessary
• Carefully evaluate risks associated with business or investment activities
• Review all documentation and agreements thoroughly
The Company’s services are intended to assist clients in strategic planning and decision-making, but the Company does not assume responsibility for decisions made by the client based on the provided consultancy or advisory services.
Clients agree that:
• All business decisions are made at their own discretion and risk.
• The Company shall not be responsible for losses, liabilities, or damages arising from the client’s decisions or actions.
• Clients must ensure that any project, investment, or business activity complies with applicable laws and regulations within Pakistan or any other jurisdiction involved.
Important Notice
All official consultancy services, communications, and business dealings with First Noble Step (Private) Limited must occur only through the Company’s official channels, authorized representatives, and verified communication platforms.
The Company shall not be responsible for any advice, commitments, or representations made by unauthorized persons claiming association with the Company.
Startup Support and Promotional Capital Disclaimer
From time to time, First Noble Step (Private) Limited may promote or advertise initiatives stating that the Company may provide initial startup capital, financial assistance, or support to selected clients with promising or high-potential business plans.
Such initiatives are intended solely as promotional, goodwill, or marketing-based support programs designed to encourage entrepreneurship and highlight the Company’s consultancy and advisory services.
Accordingly, the following conditions apply:
No Investment Offering
Any reference to startup capital, financial assistance, funding support, or initial capital provided by the Company shall not be construed as an investment offering, investment solicitation, or financial advisory service.
The Company does not operate as an investment firm, venture capital fund, asset management company, or financial institution, and such promotional statements must not be interpreted as an offer to provide regulated financial or investment services.
Promotional Nature of the Offer
Any mention of providing startup capital or financial assistance by First Noble Step (Private) Limited is strictly a voluntary promotional initiative undertaken at the sole discretion of the Company.
The Company may use such statements in its marketing communications, advertisements, campaigns, or promotional materials solely to promote its consultancy and advisory services.
No Guarantee of Capital or Financial Support
Clients and users expressly acknowledge and agree that:
• Not all clients will receive startup capital or financial support.
• Submission of a business plan does not guarantee any financial assistance.
• Selection of any client for such support is entirely subject to the Company’s internal evaluation and discretion.
The Company shall not be obligated to provide funding, capital, grants, or financial support to any client under any circumstance.
Right to Modify or Withdraw the Program
First Noble Step (Private) Limited reserves the absolute right, at any time and without prior notice, to:
• Modify the terms of such promotional initiatives
• Suspend or discontinue the program
• Change eligibility criteria
• Withdraw the promotional offer entirely
The Company may also choose not to award or distribute any startup capital under such initiatives without providing any explanation.
Client Acknowledgment and Acceptance
By engaging with the Company’s services, submitting a business plan, or responding to any promotional campaign related to startup capital or financial support, the client expressly acknowledges and agrees that:
• The initiative is promotional in nature only.
• The Company has no legal obligation to provide funding.
• Participation in consultancy services does not create any entitlement to financial assistance.
Clients must accept these Terms and Conditions before purchasing or engaging any services offered by the Company.
Limitation of Claims
Under no circumstances shall First Noble Step (Private) Limited be held liable for any claims, expectations, misunderstandings, or disputes arising from the Company’s promotional references to startup capital, financial assistance, or similar initiatives.
Marketing Representation and Advertisement Disclaimer
First Noble Step (Private) Limited may from time to time publish promotional content, advertisements, marketing campaigns, announcements, statements, or informational materials across various platforms including but not limited to:
• The Company’s official website
• Social media platforms
• Digital advertisements
• Email campaigns
• Printed promotional materials
• Public presentations or informational events
Such materials may include general descriptions of services, promotional offers, illustrative statements, success stories, marketing slogans, or examples of potential business outcomes.
Informational and Promotional Nature
All marketing, promotional, and advertising materials issued by First Noble Step (Private) Limited are intended solely for informational and promotional purposes.
Such materials do not constitute legally binding commitments, guarantees, offers of investment, financial promises, or contractual obligations by the Company.
No Reliance on Promotional Statements
Clients and users of the Company’s services acknowledge and agree that:
• Promotional statements, marketing slogans, advertisements, and similar communications should not be relied upon as guarantees of results.
• Any examples, case studies, projections, or success stories referenced in promotional materials are illustrative in nature only and may not reflect typical outcomes.
Actual results may vary significantly depending on numerous factors including:
• Market conditions
• Client capabilities
• Financial resources
• Regulatory requirements
• Business execution strategies
Right to Modify Marketing Content
First Noble Step (Private) Limited reserves the unrestricted right to:
• Modify marketing statements
• Update advertising campaigns
• Withdraw promotional offers
• Change service descriptions
at any time without prior notice.
No promotional statement shall be interpreted as creating a permanent or guaranteed offer.
No Liability for Interpretation of Marketing Content
The Company shall not be held liable for any misunderstanding, interpretation, or reliance placed upon marketing materials by any individual or organization.
Clients are advised to review the official Terms and Conditions, service agreements, and written contracts before making any business decision or engaging with the Company’s services.
Governing Terms
In the event of any inconsistency between marketing materials and the official Terms and Conditions or formal service agreements issued by First Noble Step (Private) Limited, the Terms and Conditions and signed agreements shall prevail.
Anti-Fraud, Impersonation, and Unauthorized Representation Policy
First Noble Step (Private) Limited maintains a strict zero-tolerance policy against fraud, impersonation, and unauthorized representation.
No individual, agent, consultant, representative, employee, partner, or third party is permitted to:
• Represent the Company without written authorization
• Use the Company’s name, logo, brand identity, or documents without approval
• Offer consultancy services on behalf of the Company without authorization
• Collect payments using the Company’s name outside official channels
• Mislead clients through false promises, guarantees, or commitments
Any individual or organization falsely claiming affiliation with First Noble Step (Private) Limited shall be considered engaging in fraudulent misrepresentation.
The Company reserves the right to:
• Take legal action against such individuals or entities
• Report fraudulent activities to relevant law enforcement or regulatory authorities
• Publicly disassociate from unauthorized representatives
Clients are strongly advised to verify all communications through the Company’s official contact channels before relying on any information.
Confidentiality and Non-Disclosure Protection
During the course of providing consultancy services, First Noble Step (Private) Limited may receive or access confidential information belonging to clients.
Such information may include but is not limited to:
• Business plans
• Financial data
• Market research
• Strategic documents
• Operational details
• Intellectual property
• Trade secrets
• Proprietary methodologies
The Company undertakes to handle all confidential information with reasonable care and professional responsibility.
However, confidentiality obligations shall not apply to information that:
• Is already publicly available
• Becomes publicly available through lawful means
• Is disclosed with the client’s consent
• Is required to be disclosed by law, regulatory authority, or court order
Clients also agree not to disclose or misuse any proprietary frameworks, materials, reports, or intellectual property developed by the Company without written consent.
Limitation of Consultancy Liability
To the maximum extent permitted by applicable law, First Noble Step (Private) Limited, including its directors, employees, consultants, partners, and affiliates, shall not be liable for any:
• Direct or indirect financial losses
• Business interruption losses
• Loss of profits or anticipated savings
• Loss of opportunities
• Loss of data or confidential information
• Reputational damage
• Third-party claims arising from client decisions
The Company’s consultancy services are provided on a best-effort professional basis and rely on information provided by clients and publicly available data.
Therefore:
• The Company shall not be responsible for inaccuracies in information supplied by clients.
• The Company shall not be liable for business outcomes resulting from client decisions.
• Clients acknowledge that consultancy services involve strategic guidance rather than guaranteed results.
Under no circumstances shall the total liability of First Noble Step (Private) Limited exceed the total amount of fees paid by the client for the specific consultancy service in question.
Official Communication Notice
All official communication with First Noble Step (Private) Limited must occur through the Company’s verified channels including its official website, corporate email addresses, and authorized representatives.
The Company shall not be responsible for misinformation, commitments, or financial transactions conducted through unofficial or unauthorized sources.
9. No Professional Legal or Financial Advice
Information on this website is provided for general informational purposes only.
It should not be interpreted as:
• Legal advice
• Financial advice
• Tax advice
• Investment guarantees
Users should consult qualified professionals before making decisions.
10. Third-Party Links
Our Website may contain links to third-party websites.
We:
• Do not control these websites
• Are not responsible for their content
• Do not guarantee their accuracy
Accessing third-party sites is at the user's own risk.
11. Confidentiality
Any business information shared by users will be treated confidentially where reasonably possible.
However the Company cannot guarantee complete security of data transmission over the internet.
12. Privacy Policy
Your use of the website is also governed by our Privacy Policy, which explains:
• Data collection
• Information usage
• Security practices
• Cookies usage
By using the website you agree to the Privacy Policy.
13. Data Security
We take reasonable steps to protect data including:
• Secure servers
• Encryption protocols
• Access controls
• Monitoring systems
However no online platform can guarantee absolute security.
14. Limitation of Liability
To the fullest extent permitted by law, First Noble Step (Private) Limited shall not be liable for:
• Direct damages
• Indirect damages
• Business losses
• Profit loss
• Data loss
• Opportunity loss
• System interruptions
Use of the website is at your own risk.
15. Indemnification
Users agree to indemnify and hold harmless the Company, its directors, employees, and affiliates from any claims, damages, liabilities, or legal costs resulting from:
• Violation of these Terms
• Misuse of the Website
• Illegal activities conducted through the platform
16. Website Availability
We do not guarantee that the website will:
• Always be available
• Be free from errors
• Be free from interruptions
• Be free from viruses
We may temporarily suspend services for maintenance or upgrades.
17. Service Modifications
The Company reserves the right to:
• Modify website content
• Change services
• Update features
• Adjust service offerings
Without prior notice.
18. Termination
We may terminate or restrict access if:
• Terms are violated
• Fraud is suspected
• Misuse occurs
• Legal obligations require it
Termination may occur without prior notice.
19. Governing Law
These Terms shall be governed by the laws of Pakistan.
Any disputes shall be subject to the jurisdiction of the courts of Pakistan.
20. Dispute Resolution
In case of disputes:
1. Parties should first attempt amicable resolution.
2. If unresolved, the matter may proceed to mediation or arbitration.
3. If still unresolved, disputes will be settled in courts of competent jurisdiction.
21. Force Majeure
The Company shall not be liable for failure to perform obligations due to events beyond reasonable control including:
• Natural disasters
• War
• Government actions
• Internet outages
• Cyber attacks
• Power failures
22. Changes to Terms
We reserve the right to update these Terms at any time.
Changes become effective once published on the Website.
Users are responsible for regularly reviewing the Terms.
23. Entire Agreement
These Terms constitute the entire agreement between the user and the Company regarding the use of the Website.
24. Severability
If any provision of these Terms is deemed invalid or unenforceable, the remaining provisions will remain fully effective.
Final Statement
By using the website of First Noble Step (Private) Limited, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.`);
      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).send('Error generating PDF');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
