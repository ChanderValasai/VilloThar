import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout';
import { api } from '../services/api';
import { TicketCategory } from '../types/domain';

export function ContactSupportPage() {
  const [contact, setContact] = useState<any>(null);
  const [contactName, setContactName] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Internet Connectivity');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedTicketId, setSubmittedTicketId] = useState('');

  useEffect(() => {
    api.public.getOverview().then((d) => setContact(d.contact));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.public.submitSupport({
        contactName,
        contactMobile,
        category,
        subject,
        description,
      });
      setSubmittedTicketId(res.ticketId);
      setContactName('');
      setContactMobile('');
      setSubject('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Unable to submit support request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout contact={contact}>
      <section className="py-12 lg:py-16 bg-[#FFFFFF] border-b border-[#E2E0DA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-3">
          <p className="text-xs font-medium text-[#0B66A8]">Community Support & Helpdesk</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#132238]">
            Contact & Support Request
          </h1>
          <p className="text-base text-[#475569] max-w-2xl">
            Submit a complaint, identity-verification question, payment inquiry, or connectivity issue directly to the VilloThar support team.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Contact Details (Editable in Admin Dashboard) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#132238]">
                Official Support Channels
              </h2>
              <p className="text-xs text-[#64748B]">
                Contact details below are managed by Super Administrators in the Admin Dashboard.
              </p>

              <div className="space-y-3 pt-2 text-sm text-[#475569]">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#0B66A8] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[#132238]">Phone / Helpline</p>
                    <p>{contact?.supportPhone || 'http://wa.me/923212472380'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#0B66A8] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[#132238]">Email Address</p>
                    <p>{contact?.supportEmail || 'admin@villothar.com'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#0B66A8] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[#132238]">Operations & Community Desk</p>
                    <p>{contact?.officeAddress || 'Mithi NOC & Pabohar Desk, Tharparkar'}</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {contact?.supportHours || 'Support hours configurable in Admin'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-2">
              <h3 className="font-display text-base font-bold text-[#132238]">
                Customer Support Process
              </h3>
              <ol className="list-decimal list-inside text-sm text-[#475569] space-y-1.5">
                <li>Submit your request here or inside your Customer Portal.</li>
                <li>Receive a tracking ticket reference immediately.</li>
                <li>Support Agents or Mithi NOC Technicians review and reply.</li>
                <li>Track progress and replies inside your Customer Dashboard.</li>
              </ol>
            </div>
          </div>

          {/* Support / Complaint Form */}
          <div className="lg:col-span-7">
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold text-[#132238] mb-5">
                Submit Support or Complaint Ticket
              </h2>

              {submittedTicketId && (
                <div className="mb-6 p-4 rounded-lg bg-[#15803D]/10 border border-[#15803D]/25 text-[#15803D] text-sm flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Support request recorded</p>
                    <p className="mt-0.5">
                      Reference ID: <span className="font-mono-data">{submittedTicketId}</span>. Our support team will follow up via your mobile number.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-5 p-3.5 rounded-lg bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-sm text-[#B91C1C]">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#132238] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#132238] mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactMobile}
                      onChange={(e) => setContactMobile(e.target.value)}
                      placeholder="03XXXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm font-mono-data focus:outline-none focus:border-[#0B66A8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#132238] mb-1.5">
                    Issue Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
                  >
                    <option value="Internet Connectivity">Internet Connectivity</option>
                    <option value="Login Problem">Login Problem</option>
                    <option value="Payment Problem">Payment Problem</option>
                    <option value="Package Expiry">Package Expiry</option>
                    <option value="Device Registration">Device Registration</option>
                    <option value="Identity Verification">Identity Verification</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#132238] mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#132238] mb-1.5">
                    Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened, including your village and device name if relevant (never paste your full CNIC here)."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E0DA] bg-[#FAF9F6] text-sm focus:outline-none focus:border-[#0B66A8]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] disabled:opacity-60 rounded-lg min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : 'Submit Support Request'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
