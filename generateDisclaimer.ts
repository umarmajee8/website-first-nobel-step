import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream(path.join(__dirname, 'Disclaimer.pdf')));

doc.fontSize(16).font('Helvetica-Bold').text('Disclaimer', { align: 'center' });
doc.moveDown();
doc.fontSize(14).text('First Noble Step (Private) Limited', { align: 'center' });
doc.moveDown(2);

doc.fontSize(12).font('Helvetica-Bold').text('1. General Information');
doc.font('Helvetica').fontSize(10).text('The information, services, and content provided on the website of First Noble Step (Private) Limited are intended for general informational and consultancy purposes only.\n\nWhile we strive to ensure that all information presented on this website is accurate and up to date, the Company makes no representations or warranties of any kind, express or implied, about the completeness, reliability, accuracy, or suitability of the information, services, or materials provided.\n\nAny reliance you place on such information is strictly at your own risk.');
doc.moveDown();

doc.fontSize(12).font('Helvetica-Bold').text('2. No Professional Financial or Investment Advice');
doc.font('Helvetica').fontSize(10).text('The consultancy, guidance, business suggestions, startup recommendations, or strategic insights provided by First Noble Step (Private) Limited are intended for general business advisory purposes only.\n\nThe Company does not provide regulated financial, investment, legal, tax, or brokerage advice.\n\nUsers are strongly encouraged to consult qualified financial advisors, lawyers, or other professionals before making any business, financial, or investment decisions.\n\nThe Company shall not be held responsible for any losses, damages, or liabilities arising from decisions taken based on information provided through our website or services.');
doc.moveDown();

doc.fontSize(12).font('Helvetica-Bold').text('3. Startup Capital / Financial Support Disclaimer');
doc.font('Helvetica').fontSize(10).text('From time to time, First Noble Step (Private) Limited may promote or advertise initiatives such as:\n\n• startup support\n• startup capital giveaways\n• business plan competitions\n\nThese initiatives are purely promotional, discretionary, and optional programs offered by the Company.\n\nThe Company does not guarantee that any user, client, or applicant will receive financial support, funding, or capital.\n\nParticipation in such programs does not create any legal obligation, partnership, investment commitment, or financial guarantee from the Company.\n\nThe Company reserves the sole and absolute right to:\n\n• approve or reject any applicant\n• modify program terms\n• discontinue any promotional offer\n• cancel or withdraw such initiatives at any time without prior notice.');
doc.moveDown();

doc.fontSize(12).font('Helvetica-Bold').text('4. Business Results Disclaimer');
doc.font('Helvetica').fontSize(10).text('Success in business depends on numerous factors including but not limited to:\n\n• market conditions\n• management decisions\n• capital availability\n• economic factors\n• execution capability\n\nTherefore, First Noble Step (Private) Limited does not guarantee business success, profits, growth, funding approval, or financial returns.\n\nResults may vary significantly from one individual or business to another.');
doc.moveDown();

doc.fontSize(12).font('Helvetica-Bold').text('5. Client Testimonials and Marketing Statements');
doc.font('Helvetica').fontSize(10).text('Any testimonials, marketing statements, promotional figures, or client references displayed on the website are intended for illustrative and promotional purposes only.\n\nThey should not be interpreted as guarantees of results or outcomes.\n\nIndividual results may vary depending on multiple business factors.');
doc.moveDown();

doc.fontSize(12).font('Helvetica-Bold').text('6. Third-Party Services');
doc.font('Helvetica').fontSize(10).text('Our website or services may include references or links to third-party tools, platforms, partners, or external service providers.\n\nFirst Noble Step (Private) Limited does not control, endorse, or assume responsibility for the services, policies, or actions of third-party organizations.\n\nUsers interact with third-party services at their own discretion and risk.');
doc.moveDown();

doc.fontSize(12).font('Helvetica-Bold').text('7. Limitation of Liability');
doc.font('Helvetica').fontSize(10).text('Under no circumstances shall First Noble Step (Private) Limited, its directors, employees, consultants, or affiliates be liable for:\n\n• direct or indirect losses\n• business losses\n• financial damages\n• loss of data or profits\n• reputational damages\n\narising from the use of our website, services, consultancy, or any information provided.');
doc.moveDown();

doc.fontSize(12).font('Helvetica-Bold').text('8. Right to Modify Disclaimer');
doc.font('Helvetica').fontSize(10).text('The Company reserves the right to update, modify, or replace this Disclaimer at any time without prior notice.\n\nUsers are encouraged to review this page periodically.\n\nContinued use of the website indicates acceptance of the updated Disclaimer.');
doc.moveDown();

doc.fontSize(12).font('Helvetica-Bold').text('9. Contact Information');
doc.font('Helvetica').fontSize(10).text('For any questions regarding this Disclaimer, please contact:\nsupport@firstnoblestep.com');

doc.end();

console.log('Disclaimer.pdf generated successfully.');
