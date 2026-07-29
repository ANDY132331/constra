import Link from "next/link";
import { HardHat } from "lucide-react";

export const metadata = { title: "Privacy Policy — Constra" };

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      body: `We collect information you provide directly when creating an account (name, email, company name), information generated through your use of the Service (time entries, project data, photos, GPS coordinates during clock-in), and technical information (device type, IP address, browser type) for security and diagnostics.`,
    },
    {
      title: "2. GPS and Photo Data",
      body: `When crew members clock in or out, Constra may capture GPS coordinates and/or a photo for verification purposes. This data is associated with the time entry and stored in your company's workspace. Only company administrators can access this data. We do not share GPS or photo data with any third party, and it is never used for purposes beyond verifying attendance.`,
    },
    {
      title: "3. How We Use Your Information",
      body: `We use collected information to: (a) provide and improve the Service; (b) authenticate users and secure your account; (c) generate reports, invoices, and payroll exports as requested; (d) communicate with you about your account or the Service; and (e) comply with legal obligations. We do not use your data for advertising or marketing to third parties.`,
    },
    {
      title: "4. Data Sharing",
      body: `We do not sell your personal information. We share data only with: (a) infrastructure providers necessary to operate the Service (cloud hosting, authentication) under confidentiality agreements; (b) law enforcement or regulators when required by law; or (c) a successor organization if Constra is acquired or merged, with advance notice to you.`,
    },
    {
      title: "5. Data Retention",
      body: `We retain your data for as long as your account is active. After account termination, data is retained for 30 days to allow recovery, then permanently deleted. You may request earlier deletion by contacting us. Certain data may be retained longer where required by law.`,
    },
    {
      title: "6. Security",
      body: `We implement industry-standard security measures including encryption in transit (TLS) and at rest, row-level security policies ensuring your company's data is isolated from other tenants, and access controls that limit data access to authenticated users within your company. No system is perfectly secure — report any suspected breach immediately.`,
    },
    {
      title: "7. Your Rights",
      body: `Depending on your jurisdiction, you may have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; object to or restrict certain processing; and data portability. To exercise these rights, contact us through the app. We will respond within 30 days.`,
    },
    {
      title: "8. Employee and Contractor Data",
      body: `If you use Constra to manage employee or contractor records, you are the data controller for that information and Constra acts as a data processor. You are responsible for your own privacy notices to employees and for complying with applicable employment and data protection laws in your jurisdiction.`,
    },
    {
      title: "9. Children's Privacy",
      body: `The Service is intended for business use and is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe a child has provided personal information to us, contact us and we will delete it.`,
    },
    {
      title: "10. Cookies and Local Storage",
      body: `We use session cookies and browser local/session storage to maintain your authenticated session and remember your preferences within the app. We do not use advertising cookies or third-party tracking cookies. You can disable cookies in your browser, but some features may not work correctly.`,
    },
    {
      title: "11. Changes to This Policy",
      body: `We may update this Privacy Policy from time to time. We will notify you of material changes by posting a notice in the app or by email at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes acceptance of the updated policy.`,
    },
    {
      title: "12. Contact Us",
      body: `For privacy-related questions, requests, or complaints, please contact us through the in-app support channel or at the contact information listed on our website. We take all privacy concerns seriously and will respond promptly.`,
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

        <h1 className="text-4xl font-black tracking-tight mb-2">Privacy Policy</h1>
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
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
