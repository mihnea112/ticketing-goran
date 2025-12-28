import React from "react";

const Footer: React.FC = () => (
  <footer className="bg-[#050402] text-yellow-100/60 pt-24 pb-12 border-t border-yellow-900/20 relative overflow-hidden">
    {/* Decorative Gradient Blob */}
    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-yellow-600/5 rounded-full blur-[120px] pointer-events-none"></div>

    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-16 mb-20 relative z-10">
      {/* Brand Column */}
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 mb-6">
          <span className="size-8 rounded-full bg-yellow-500 flex items-center justify-center text-black">
            <span className="material-symbols-outlined text-lg font-bold">
              music_note
            </span>
          </span>
          <h3 className="text-2xl font-black text-[#faeacc] tracking-tight">
            GORAN BREGOVIĆ
          </h3>
        </div>
        <p className="text-yellow-100/40 max-w-sm leading-relaxed mb-8 text-sm">
          Eveniment organizat cu pasiune pentru muzica autentică. Nu rata ocazia
          de a fi parte din istorie într-o locație de excepție.
        </p>
        <div className="flex gap-4">
          {["facebook", "instagram", "youtube"].map((social) => (
            <a
              key={social}
              href="#"
              className="size-10 rounded-lg bg-yellow-900/10 border border-yellow-500/10 flex items-center justify-center text-yellow-600 hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all duration-300"
            >
              <span className="material-symbols-outlined text-xl">
                {social === "facebook"
                  ? "groups"
                  : social === "instagram"
                  ? "photo_camera"
                  : "play_circle"}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Links Column */}
      <div>
        <h4 className="font-bold text-[#faeacc] text-sm uppercase tracking-widest mb-6">
          Informații
        </h4>
        <ul className="space-y-3 text-sm">
          <li>
            <a
              href="#"
              className="hover:text-yellow-500 transition-colors flex items-center gap-2 group"
            >
              <span className="w-1 h-1 rounded-full bg-yellow-800 group-hover:bg-yellow-500 transition-colors"></span>{" "}
              Termeni și Condiții
            </a>
          </li>
          <li>
            <a
              href="#"
              className="hover:text-yellow-500 transition-colors flex items-center gap-2 group"
            >
              <span className="w-1 h-1 rounded-full bg-yellow-800 group-hover:bg-yellow-500 transition-colors"></span>{" "}
              Politică de Confidențialitate
            </a>
          </li>
          <li>
            <a
              href="#"
              className="hover:text-yellow-500 transition-colors flex items-center gap-2 group"
            >
              <span className="w-1 h-1 rounded-full bg-yellow-800 group-hover:bg-yellow-500 transition-colors"></span>{" "}
              Regulament Eveniment
            </a>
          </li>
        </ul>
      </div>

      {/* Contact Column */}
      <div>
        <h4 className="font-bold text-[#faeacc] text-sm uppercase tracking-widest mb-6">
          Contact
        </h4>
        <ul className="space-y-4 text-sm">
          <li className="flex items-start gap-3 group">
            <span className="material-symbols-outlined text-yellow-500 text-lg mt-0.5 group-hover:text-[#faeacc] transition-colors">
              mail
            </span>
            <span className="group-hover:text-[#faeacc] transition-colors">
              contact@bestevents.ro
            </span>
          </li>
          <li className="flex items-start gap-3 group">
            <span className="material-symbols-outlined text-yellow-500 text-lg mt-0.5 group-hover:text-[#faeacc] transition-colors">
              call
            </span>
            <span className="group-hover:text-[#faeacc] transition-colors">
              +40 722 000 000
            </span>
          </li>
          <li className="flex items-start gap-3 group">
            <span className="material-symbols-outlined text-yellow-500 text-lg mt-0.5 group-hover:text-[#faeacc] transition-colors">
              location_on
            </span>
            <span className="group-hover:text-[#faeacc] transition-colors">
              Sala Palatului
              <br />
              București, România
            </span>
          </li>
        </ul>
      </div>
    </div>

    {/* Bottom Bar */}
    <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-yellow-900/20 flex flex-col md:flex-row justify-between items-center gap-4 text-yellow-900 text-[10px] font-bold uppercase tracking-widest relative z-10">
      <p>© 2024 BestEvents Ro. Toate drepturile rezervate.</p>
      <div className="flex items-center gap-2">
        <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
        <p>Secured by Stripe</p>
      </div>
    </div>
  </footer>
);

export default Footer;
