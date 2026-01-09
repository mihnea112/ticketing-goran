import React from "react";

const Footer: React.FC = () => {
  // 👇 PASTE YOUR LINKS HERE
  const socialLinks = [
    {
      name: "facebook",
      href: "https://www.facebook.com/profile.php?id=61578622972914", // Put Facebook link here
      path: (
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      ),
    },
    {
      name: "instagram",
      href: "https://www.instagram.com/centrulculturalsarbesc?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", // Put Instagram link here
      path: (
        <>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </>
      ),
    },
    {
      name: "youtube",
      href: "https://www.youtube.com/@centrulculturalsarbesc", // Put YouTube link here
      path: (
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02l5.75-3.27-5.75-3.27z" />
      ),
    },
  ];

  return (
    <footer className="bg-[#050402] text-yellow-100/60 pt-24 pb-12 border-t border-yellow-900/20 relative overflow-hidden">
      {/* Decorative Gradient Blob */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-yellow-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-16 mb-20 relative z-10">
        {/* Brand Column (Spans 2 columns) */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <span className="size-8 rounded-full bg-yellow-500 flex items-center justify-center text-black">
              <span className="material-symbols-outlined text-lg font-bold">
                music_note
              </span>
            </span>
            <div>
              <h3 className="text-xl font-black text-[#faeacc] tracking-tight leading-none">
                BIJELO DUGME
              </h3>
              <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">
                & Goran Bregović
              </p>
            </div>
          </div>
          <p className="text-yellow-100/40 max-w-sm leading-relaxed mb-8 text-sm">
            Un eveniment jubiliar "50 de ani", organizat cu pasiune de
            <strong className="text-yellow-500/80">
              {" "}
              Asociația Centrul Cultural Sârbesc Constantin
            </strong>
            .
          </p>
          
          {/* Social Icons Section */}
          <div className="flex gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 rounded-lg bg-yellow-900/10 border border-yellow-500/10 flex items-center justify-center text-yellow-600 hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all duration-300 group"
                aria-label={social.name}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  // This removes the stroke and uses fill for a cleaner logo look on hover if desired, 
                  // but for consistency with outline style we keep stroke, 
                  // except for Facebook/Youtube which often look better filled.
                  // Current config: Outline style (stroke).
                >
                  {social.path}
                </svg>
              </a>
            ))}
          </div>
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
                centrulculturalsarbesc@gmail.com
              </span>
            </li>
            <li className="flex items-start gap-3 group">
              <span className="material-symbols-outlined text-yellow-500 text-lg mt-0.5 group-hover:text-[#faeacc] transition-colors">
                call
              </span>
              <span className="group-hover:text-[#faeacc] transition-colors">
                +40 749 883 866
              </span>
            </li>
            <li className="flex items-start gap-3 group">
              <span className="material-symbols-outlined text-yellow-500 text-lg mt-0.5 group-hover:text-[#faeacc] transition-colors">
                location_on
              </span>
              <span className="group-hover:text-[#faeacc] transition-colors">
                Sala Constantin Jude
                <br />
                Timișoara, România
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-yellow-900/20 flex flex-col md:flex-row justify-between items-center gap-4 text-yellow-900 text-[10px] font-bold uppercase tracking-widest relative z-10">
        <p>© 2026 Asociația Centrul Cultural Sârbesc Constantin.</p>
        <div className="flex items-center gap-2">
          <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
          <p>Secured by Stripe</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;