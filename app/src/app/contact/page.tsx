import React from 'react';
import Image from 'next/image';
import Navbar from '../../components/Navbar';

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-16">
        <section className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4">Kontaktujte nás</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Máte dotazy, připomínky nebo potřebujete pomoci? Neváhejte se na nás obrátit.
            Jsme tu, abychom vám pomohli na vaší kariérní cestě.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Napište nám</h2>
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Jméno</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Vaše jméno"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="vas.email@example.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Zpráva</label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Vaše zpráva..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Odeslat zprávu
              </button>
            </form>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Naše kontaktní údaje</h2>
            <div className="space-y-6 text-gray-700 text-lg">
              <p className="flex items-center">
                <svg className="w-6 h-6 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 12a1 1 0 112 0v1a1 1 0 11-2 0v-1zm1-8a1 1 0 00-1 1v4a1 1 0 102 0V5a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                Email: <a href="mailto:info@kariernidenik.cz" className="text-indigo-600 hover:underline ml-2">info@kariernidenik.cz</a>
              </p>
              <p className="flex items-center">
                <svg className="w-6 h-6 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                Telefon: <a href="tel:+420123456789" className="text-indigo-600 hover:underline ml-2">+420 123 456 789</a>
              </p>
              <p className="flex items-center">
                <svg className="w-6 h-6 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                Adresa: Příkladová 123, 100 00 Praha, Česká republika
              </p>
            </div>
            <div className="mt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Sledujte nás</h3>
              <div className="flex space-x-4 justify-center md:justify-start">
                <a href="#" className="text-indigo-600 hover:text-indigo-800"><Image src="/path/to/facebook-icon.svg" alt="Facebook" width={32} height={32} className="w-8 h-8" /></a>
                <a href="#" className="text-indigo-600 hover:text-indigo-800"><Image src="/path/to/twitter-icon.svg" alt="Twitter" width={32} height={32} className="w-8 h-8" /></a>
                <a href="#" className="text-indigo-600 hover:text-indigo-800"><Image src="/path/to/linkedin-icon.svg" alt="LinkedIn" width={32} height={32} className="w-8 h-8" /></a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ContactPage;