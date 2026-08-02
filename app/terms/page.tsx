import Link from "next/link";
import { HardHat } from "lucide-react";

export const metadata = { title: "Terms of Service — Constra" };

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      body: `By accessing or using Constra ("the Service"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of a company or other legal entity, you represent that you have authority to bind that entity to these Terms. If you do not agree, do not use the Service.`,
    },
    {
      title: "2. Description of Service",
      body: `Constra is a field workforce management platform for construction and trades businesses. The Service includes time tracking, project management, crew management, invoicing, safety reporting, and related tools. We reserve the right to modify or discontinue any part of the Service at any time with reasonable notice.`,
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
      title: "7. Beta Access",
      body: `The Service is currently provided at no cost during our public beta period. All features are available to all users without a subscription. We reserve the right to introduce pricing after the beta with at least 30 days' advance notice. Users who join during the beta will be given preferential early-adopter rates.`,
    },
    {
      title: "8. Intellectual Property",
      body: `The Service, including its software, design, and content, is owned by Constra and protected by copyright and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written permission.`,
    },
    {
      title: "9. Disclaimers",
      body: `THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK. CONSTRA IS NOT RESPONSIBLE FOR ANY EMPLOYMENT LAW COMPLIANCE MATTERS ARISING FROM YOUR USE OF THE SERVICE.`,
    },
    {
      title: "10. Limitation of Liability",
      body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, CONSTRA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM OR (B) $100.`,
    },
    {
      title: "11. Indemnification",
      body: `You agree to indemnify and hold harmless Constra and its officers, directors, and employees from any claims, damages, or expenses (including legal fees) arising from your use of the Service, your violation of these Terms, or any data you submit including claims by your employees or crew members.`,
    },
    {
      title: "12. Termination",
      body: `You may stop using the Service at any time through your account settings. We may suspend or terminate your access if you violate these Terms or fail to pay. Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days after termination to allow export, after which it will be permanently deleted.`,
    },
    {
      title: "13. Changes to Terms",
      body: `We may update these Terms from time to time. We will notify you of material changes by posting a notice in the app or by email at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes your acceptance of the updated Terms.`,
    },
    {
      title: "14. Governing Law",
      body: `These Terms are governed by the laws of the Province of British Columbia and the federal laws of Canada applicable therein, without regard to conflict of law principles. Any disputes shall be resolved in the courts located in British Columbia, Canada.`,
    },
    {
      title: "15. Contact",
      body: `If you have questions about these Terms, please contact us at hello@constra.app or through the in-app support channel.`,
    },
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#080808] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-12 group w-fit">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
            <HardHat size={18} className="text-black" />
          </div>
          <span className="text-lg font-black tracking-tight group-hover:text-amber-400 transition-colors">Constra</span>
        </Link>

        <h1 className="text-4xl font-black tracking-tight mb-2">Terms of Service</h1>
        <p className="text-white/40 text-[14px] mb-12">Last updated: July 30, 2026</p>

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
