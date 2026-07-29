import Link from "next/link";
import { HardHat } from "lucide-react";

export const metadata = { title: "Terms of Service — Constra" };

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      body: `By accessing or using Constra ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all users, including company administrators and crew members.`,
    },
    {
      title: "2. Description of Service",
      body: `Constra is a field workforce management platform for construction and trades businesses. The Service includes time tracking, project management, crew management, invoicing, safety reporting, and related tools. We reserve the right to modify or discontinue any part of the Service at any time.`,
    },
    {
      title: "3. Account Registration",
      body: `You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use of your account. Each company workspace may have one administrator account and multiple crew member accounts.`,
    },
    {
      title: "4. Acceptable Use",
      body: `You agree to use Constra only for lawful purposes and in compliance with all applicable laws. You may not: (a) use the Service for any illegal purpose; (b) attempt to gain unauthorized access to any part of the Service; (c) transmit harmful, offensive, or misleading content; (d) reverse-engineer or copy the Service; or (e) use the Service to compete with Constra.`,
    },
    {
      title: "5. Data and Privacy",
      body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to our collection and use of data as described in the Privacy Policy. You retain ownership of all data you submit to the Service, and we will not sell your data to third parties.`,
    },
    {
      title: "6. Crew Data and Consent",
      body: `If you use Constra to track employee or contractor data (including time, location, and photos), you are responsible for obtaining any necessary consent from those individuals in accordance with applicable employment and privacy laws in your jurisdiction. GPS and photo data collected during clock-in is stored securely and used only for verification purposes.`,
    },
    {
      title: "7. Intellectual Property",
      body: `The Service, including its software, design, and content, is owned by Constra and protected by copyright and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written permission.`,
    },
    {
      title: "8. Disclaimers",
      body: `THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK. CONSTRA IS NOT RESPONSIBLE FOR ANY EMPLOYMENT LAW COMPLIANCE MATTERS ARISING FROM YOUR USE OF THE SERVICE.`,
    },
    {
      title: "9. Limitation of Liability",
      body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, CONSTRA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM.`,
    },
    {
      title: "10. Termination",
      body: `You may stop using the Service at any time. We may suspend or terminate your access if you violate these Terms or if we discontinue the Service. Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days after termination, after which it may be permanently deleted.`,
    },
    {
      title: "11. Changes to Terms",
      body: `We may update these Terms from time to time. We will notify you of significant changes by posting a notice in the app or by email. Your continued use of the Service after changes are posted constitutes your acceptance of the updated Terms.`,
    },
    {
      title: "12. Governing Law",
      body: `These Terms are governed by the laws of the jurisdiction in which Constra operates, without regard to conflict of law provisions. Any disputes shall be resolved in the courts of that jurisdiction.`,
    },
    {
      title: "13. Contact",
      body: `If you have questions about these Terms, please contact us through the app or at the support contact listed on our website.`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-12 group w-fit">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
            <HardHat size={18} className="text-black" />
          </div>
          <span className="text-lg font-black tracking-tight group-hover:text-amber-400 transition-colors">Constra</span>
        </Link>

        <h1 className="text-4xl font-black tracking-tight mb-2">Terms of Service</h1>
        <p className="text-white/40 text-[14px] mb-12">Last updated: {new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="space-y-10">
          {sections.map(({ title, body }) => (
            <section key={title}>
              <h2 className="text-[15px] font-bold text-white mb-3">{title}</h2>
              <p className="text-[14px] text-white/55 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-white/25">
          <span>© {new Date().getFullYear()} Constra. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
