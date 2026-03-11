
import React from 'react';
import Logo from './Logo.tsx';

interface Props {
  onApply: () => void;
}

const Footer: React.FC<Props> = ({ onApply }) => {
  return (
    <footer className="bg-green-50 dark:bg-gray-950 text-gray-700 dark:text-gray-400 py-12 border-t border-green-100 dark:border-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="md:col-span-1">
            <div className="mb-6">
              <Logo className="h-12" />
            </div>
            <p className="text-xs leading-relaxed mb-6 dark:text-gray-500">
              The official membership portal of First Nobel Step (Pvt.) Ltd., legally registered by the Government of Pakistan to foster global success for our citizens.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-white dark:bg-gray-800 border border-green-200 dark:border-gray-700 text-pakistan-green dark:text-green-400 rounded-full flex items-center justify-center hover:bg-pakistan-green hover:text-white transition-all shadow-sm"><i className="fa-brands fa-facebook-f text-sm"></i></a>
              <a href="#" className="w-9 h-9 bg-white dark:bg-gray-800 border border-green-200 dark:border-gray-700 text-pakistan-green dark:text-green-400 rounded-full flex items-center justify-center hover:bg-pakistan-green hover:text-white transition-all shadow-sm"><i className="fa-brands fa-instagram text-sm"></i></a>
              <a href="#" className="w-9 h-9 bg-white dark:bg-gray-800 border border-green-200 dark:border-gray-700 text-pakistan-green dark:text-green-400 rounded-full flex items-center justify-center hover:bg-pakistan-green hover:text-white transition-all shadow-sm"><i className="fa-brands fa-linkedin-in text-sm"></i></a>
            </div>
          </div>
          
          <div>
            <h4 className="text-pakistan-green dark:text-green-500 font-lemon tracking-widest text-[9px] mb-4">Resources</h4>
            <ul className="space-y-2 text-xs font-bold">
              <li><a href="tel:+92519876543" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Career Blog</a></li>
              <li><a href="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-pakistan-green dark:text-green-500 font-lemon tracking-widest text-[9px] mb-4">Get In Touch</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex gap-3">
                <i className="fa-solid fa-location-dot mt-0.5 text-pakistan-green dark:text-green-500"></i>
                <span className="font-bold text-gray-900 dark:text-gray-200">Headquarters: Blue Area, <br />Islamabad, Pakistan</span>
              </li>
              <li className="flex gap-3">
                <i className="fa-solid fa-phone mt-0.5 text-pakistan-green dark:text-green-500"></i>
                <span className="font-bold text-gray-900 dark:text-gray-200">+92 51 9876543</span>
              </li>
              <li className="flex gap-3">
                <i className="fa-solid fa-envelope mt-0.5 text-pakistan-green dark:text-green-500"></i>
                <span className="font-bold text-gray-900 dark:text-gray-200">support@firstmillionstep.com.pk</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-green-200 dark:border-gray-800 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-gray-900 rounded-full border border-green-100 dark:border-gray-800 shadow-[0_5px_15px_rgba(1,65,28,0.1)]">
            <div className="w-6 h-6 flex items-center justify-center">
               <img 
                 src="https://upload.wikimedia.org/wikipedia/commons/e/ef/State_emblem_of_Pakistan.svg" 
                 alt="Govt Logo" 
                 className="w-full h-full object-contain"
               />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-lemon tracking-widest text-gray-400 leading-none">Registered by</span>
              <span className="text-[10px] font-bold text-pakistan-green dark:text-green-400 tracking-tight">Government of Pakistan</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-center items-center text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-600">
            <p>© 2026 First Nobel Step (Pvt.) Ltd. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
