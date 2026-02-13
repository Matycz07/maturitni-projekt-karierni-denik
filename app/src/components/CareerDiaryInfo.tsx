import React from 'react';

// Ikony pro jednotlivé sekce
const ReflectionIcon = () => (
  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const GoalIcon = () => (
  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const GrowthIcon = () => (
  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const CareerDiaryInfo: React.FC = () => {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Hlavička sekce */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold mb-4 tracking-wide uppercase">
            Váš osobní průvodce
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
            Váš Kariérní Deník: <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Cesta k Úspěchu
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
            Kariérní deník je více než jen záznam událostí. Pomáhá vám reflektovat minulost, 
            plánovat budoucnost a efektivně dosahovat vašich profesních cílů.
          </p>
        </div>

        {/* Mřížka karet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Karta 1 */}
          <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-300 group-hover:text-white transition-colors duration-300">
              <div className="group-hover:text-white transition-colors duration-300">
                 <ReflectionIcon />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Reflexe a Sebeuvědomění</h3>
            <p className="text-slate-600 leading-relaxed">
              Zaznamenávejte své úspěchy, výzvy a lekce. Pochopte své silné stránky a oblasti, 
              kde můžete růst.
            </p>
          </div>

          {/* Karta 2 */}
          <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-300 group-hover:text-white transition-colors duration-300">
              <div className="group-hover:text-white transition-colors duration-300">
                <GoalIcon />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Stanovení Cílů</h3>
            <p className="text-slate-600 leading-relaxed">
              Definujte jasné a dosažitelné kariérní cíle. Sledujte svůj pokrok v reálném čase 
              a zůstaňte motivovaní.
            </p>
          </div>

          {/* Karta 3 */}
          <div className="group bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-300 group-hover:text-white transition-colors duration-300">
              <div className="group-hover:text-white transition-colors duration-300">
                <GrowthIcon />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Rozvoj Dovedností</h3>
            <p className="text-slate-600 leading-relaxed">
              Identifikujte dovednosti, které potřebujete rozvíjet, a vytvořte si akční plán, 
              jak je získat.
            </p>
          </div>
        </div>

        {/* CTA Tlačítko */}
        <div className="text-center">
          <button className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30">
            Začněte s vaším deníkem dnes
            <svg className="w-5 h-5 ml-2 -mr-1 transition-transform duration-200 group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  );
};

export default CareerDiaryInfo;