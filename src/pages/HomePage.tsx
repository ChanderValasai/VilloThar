import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MapPin,
  Radio,
  ShieldCheck,
  Smartphone,
  Users,
  Wifi,
} from 'lucide-react';
import { PublicLayout } from '../components/PublicLayout';
import { SafeImage } from '../components/SafeImage';
import { StatusLabel } from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { BASELINE_CONTACT, BASELINE_PACKAGES, BASELINE_VILLAGES } from '../data/publicBaseline';
import { api } from '../services/api';
import { PackagePlan, Village } from '../types/domain';
import { resolveSupportEmail, resolveWhatsAppSupport } from '../utils/contactLinks';

const HOME_FAQS = [
  {
    q: 'Can I use one package on multiple phones or laptops?',
    a: 'No. Every registered device requires its own dedicated package. Each package authorizes one specific device MAC address at 2 Mbps.',
  },
  {
    q: 'Is Mithi a customer Wi-Fi coverage village?',
    a: 'No. Mithi hosts our Network Operations Centre (NOC) and primary regional hub. Pabohar (approximately 12 km from Mithi) is our first pilot customer coverage village.',
  },
  {
    q: 'Why is CNIC verification required?',
    a: 'Identity verification supports regulatory compliance and community accountability. VilloThar masks CNIC numbers in routine views, encrypts them at rest, and integrates with an authorized verification workflow for secure onboarding.',
  },
  {
    q: 'How do I connect my phone for the first time?',
    a: 'Join the VilloThar Wi-Fi network in your village, open the captive portal, register with your CNIC and mobile number, register your device, choose a package, and complete payment.',
  },
];

export function HomePage() {
  const { t } = useLanguage();
  const [packages, setPackages] = useState<PackagePlan[]>(BASELINE_PACKAGES);
  const [villages, setVillages] = useState<Village[]>(BASELINE_VILLAGES);
  const [contact, setContact] = useState<any>(BASELINE_CONTACT);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.public
      .getOverview()
      .then((data) => {
        if (Array.isArray(data?.packages) && data.packages.length > 0) {
          setPackages(data.packages);
        }
        if (Array.isArray(data?.villages) && data.villages.length > 0) {
          setVillages(data.villages);
        }
        if (data?.contact) {
          setContact(data.contact);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const nocVillage = villages.find((v) => v.role === 'NOC');
  const pilotVillages = villages.filter((v) => v.role === 'Coverage');

  return (
    <PublicLayout contact={contact}>
      {/* Hero Section */}
      <section className="border-b border-[#D9E1E8] bg-[#FFFFFF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-2 text-xs font-medium text-[#5A6471]">
                <span>Tharparkar, Sindh</span>
                <span aria-hidden="true">·</span>
                <span>Mithi NOC Hub</span>
                <span aria-hidden="true">·</span>
                <span>Pabohar Pilot Village</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-[#1F2A37] text-balance leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)' }}
              >
                {t('heroHeadline')}
              </h1>

              <p className="text-base sm:text-lg text-[#5A6471] leading-relaxed max-w-xl">
                {t('heroSubhead')}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/packages"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1B6EB5] hover:bg-[#155A92] rounded-lg transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <span>{t('ctaExplore')}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#1F2A37] bg-[#F7FAFC] hover:bg-[#EDF6FB] border border-[#D9E1E8] rounded-lg transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <span>{t('ctaHowItWorks')}</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex items-center">
              <div className="w-full rounded-2xl overflow-hidden border border-[#D9E1E8] bg-[#EDF6FB]">
                <SafeImage
                  src="/assets/aistudio/Gemini_Generated_Image___1__fb3882ea.png"
                  alt="VilloThar WISP network topology infographic showing Mithi NOC core node, relay hubs, and village distribution methods"
                  fallbackTitle="VilloThar Network Topology"
                  className="w-full h-auto object-contain block"
                />
              </div>
            </div>
          </div>

          {/* Full-width structural architecture strip below hero split */}
          <div className="mt-12 pt-8 border-t border-[#D9E1E8] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-medium text-[#8A8D91]">Ownership Model</p>
              <p className="mt-1 text-base font-semibold text-[#1F2A37]">
                Village-Owned Initiative
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#8A8D91]">Consistent Speed</p>
              <p className="mt-1 text-base font-semibold text-[#1F2A37] font-mono-data">
                2 Mbps per Device
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#8A8D91]">Operations Centre</p>
              <p className="mt-1 text-base font-semibold text-[#1F2A37]">
                Mithi NOC Hub
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#8A8D91]">First Pilot Coverage</p>
              <p className="mt-1 text-base font-semibold text-[#1F2A37]">
                Pabohar (~12 km Link)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About & Why VilloThar */}
      <section className="py-16 lg:py-20 border-b border-[#D9E1E8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2A37]">
              Built with Tharparkar communities, not as an urban afterthought
            </h2>
            <p className="mt-3 text-base text-[#5A6471] leading-relaxed">
              VilloThar is a village-owned internet initiative designed to remove steep data costs and bring predictable, community-governed Wi-Fi connectivity to rural Tharparkar.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#FFFFFF] border border-[#D9E1E8] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#1B6EB5]/10 text-[#1B6EB5] flex items-center justify-center">
                <Users className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#1F2A37]">
                01. Community Ownership
              </h3>
              <p className="text-sm text-[#5A6471] leading-relaxed">
                Operated transparently for local residents with clear per-device pricing, local support channels, and accountable village network management.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D9E1E8] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#F28C28]/10 text-[#F28C28] flex items-center justify-center">
                <Wifi className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#1F2A37]">
                02. Fair 2 Mbps Access
              </h3>
              <p className="text-sm text-[#5A6471] leading-relaxed">
                Every package offers the same reliable 2 Mbps speed per registered device—from a Rs 50 single-day pass to a Rs 600 monthly plan.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#D9E1E8] rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#6DB33F]/10 text-[#6DB33F] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#1F2A37]">
                03. Verified & Accountable
              </h3>
              <p className="text-sm text-[#5A6471] leading-relaxed">
                Identity verification, MAC-address device binding, and backend-verified payments keep village bandwidth protected for genuine users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-20 bg-[#FFFFFF] border-b border-[#D9E1E8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2A37]">
                How VilloThar Wi-Fi works
              </h2>
              <p className="mt-2 text-base text-[#5A6471]">
                Simple mobile onboarding through our captive portal—from connection to verified access.
              </p>
            </div>
            <Link
              to="/captive"
              className="text-sm font-semibold text-[#1B6EB5] hover:underline inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Open Captive Portal</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: '01',
                title: 'Join VilloThar Wi-Fi',
                desc: 'Select the VilloThar SSID on your phone or laptop inside Pabohar to open the mobile captive portal.',
              },
              {
                step: '02',
                title: 'Register & Verify CNIC',
                desc: 'Create an account with your mobile number and CNIC so identity verification can be confirmed.',
              },
              {
                step: '03',
                title: 'Register Your Device',
                desc: 'Bind your specific device and its MAC address through the network gateway integration.',
              },
              {
                step: '04',
                title: 'Choose Package & Pay',
                desc: 'Purchase a 2 Mbps package for that device. Once payment is verified, network authorization activates access.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-5 rounded-xl border border-[#D9E1E8] bg-[#F7FAFC] space-y-2"
              >
                <span className="font-mono-data text-xs font-semibold text-[#1B6EB5]">
                  STEP {item.step}
                </span>
                <h3 className="font-display text-base font-semibold text-[#1F2A37]">
                  {item.title}
                </h3>
                <p className="text-sm text-[#5A6471] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Internet Packages */}
      <section className="py-16 lg:py-20 border-b border-[#D9E1E8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2A37]">
                Transparent Internet Packages
              </h2>
              <p className="mt-2 text-base text-[#5A6471] max-w-2xl">
                All packages deliver <span className="font-semibold text-[#1F2A37]">2 Mbps</span> for one registered device. Prices are indicative pending pilot confirmation; applicable taxes may be added.
              </p>
            </div>
            <Link
              to="/packages"
              className="text-sm font-semibold text-[#1B6EB5] hover:underline whitespace-nowrap"
            >
              View full package terms
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-60 rounded-xl border border-[#D9E1E8] bg-[#FFFFFF] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-[#FFFFFF] border border-[#D9E1E8] rounded-xl p-6 flex flex-col justify-between hover:border-[#1B6EB5]/50 transition-colors"
                >
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-lg font-bold text-[#1F2A37]">
                        {pkg.name}
                      </h3>
                      <span className="font-mono-data text-xs text-[#8A8D91]">
                        {pkg.validityDays} {pkg.validityDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="font-mono-data text-3xl font-bold text-[#1F2A37]">
                        Rs {pkg.pricePkr}
                      </span>
                      <span className="text-xs text-[#8A8D91]">indicative</span>
                    </div>

                    <ul className="mt-5 space-y-2 text-sm text-[#5A6471] border-t border-[#D9E1E8] pt-4">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1B6EB5] shrink-0" aria-hidden="true" />
                        <span className="font-mono-data">{pkg.speedMbps} Mbps speed</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1B6EB5] shrink-0" aria-hidden="true" />
                        <span>1 registered device only</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#1B6EB5] shrink-0" aria-hidden="true" />
                        <span>Village-wide VilloThar APs</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to={`/portal/login?package=${pkg.id}`}
                    className="mt-6 w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-[#1B6EB5] hover:bg-[#155A92] rounded-lg transition-colors min-h-[44px]"
                  >
                    Buy {pkg.name} Package
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Coverage & Our Network */}
      <section className="py-16 lg:py-20 bg-[#FFFFFF] border-b border-[#D9E1E8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2A37]">
              Mithi NOC & Pabohar First Pilot Village
            </h2>
            <p className="text-base text-[#5A6471] leading-relaxed">
              Our regional Network Operations Centre (NOC) in Mithi manages upstream connectivity, network authorization, and monitoring across an approximately 12 km backhaul link to Pabohar.
            </p>

            <div className="space-y-4">
              {nocVillage && (
                <div className="p-4 rounded-xl border border-[#D9E1E8] bg-[#F7FAFC] flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-[#1B6EB5]" aria-hidden="true" />
                      <h3 className="font-semibold text-[#1F2A37]">
                        {nocVillage.name} — Network Operations Centre
                      </h3>
                    </div>
                    <p className="text-sm text-[#5A6471] mt-1">
                      Operations & backhaul hub only. Not an active customer Wi-Fi coverage village.
                    </p>
                  </div>
                  <StatusLabel status="NOC Hub" compact />
                </div>
              )}

              {pilotVillages.map((vil) => (
                <div
                  key={vil.id}
                  className="p-4 rounded-xl border border-[#D9E1E8] bg-[#F7FAFC] flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#6DB33F]" aria-hidden="true" />
                      <h3 className="font-semibold text-[#1F2A37]">
                        {vil.name} ({vil.distanceFromNocKm} km from Mithi NOC)
                      </h3>
                    </div>
                    <p className="text-sm text-[#5A6471] mt-1">{vil.description}</p>
                  </div>
                  <StatusLabel status={vil.coverageStatus} compact />
                </div>
              ))}
            </div>

            <div>
              <Link
                to="/coverage"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B6EB5] hover:underline"
              >
                <span>Inspect full coverage architecture</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[280px] rounded-2xl overflow-hidden border border-[#D9E1E8] bg-[#EDF6FB]">
              <SafeImage
                src="/assets/aistudio/abcb9179-4601-4257-894a-552131efa2f5_b158249f.webp"
                alt="Aerial view of a solar-powered wireless tower serving a rural Tharparkar village"
                fallbackTitle="Tharparkar Village Network Tower"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Community Impact */}
      <section className="py-16 lg:py-20 border-b border-[#D9E1E8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="h-full min-h-[260px] rounded-2xl overflow-hidden border border-[#D9E1E8] bg-[#EDF6FB]">
              <SafeImage
                src="/assets/aistudio/kidsInSchoolUsingGadgets_30d5a0f8.jfif"
                alt="Students and teachers in rural Tharparkar using laptops and desktop computers outside a village school near a wireless tower"
                fallbackTitle="Rural Digital Education in Tharparkar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center space-y-5">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2A37]">
              Practical digital inclusion for rural households
            </h2>
            <p className="text-base text-[#5A6471] leading-relaxed">
              Reliable connectivity in villages is about everyday essentials: students accessing educational lessons, families staying connected with relatives working in cities, and local residents using online services with greater affordability and confidence.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E1E8]">
                <BookOpen className="w-5 h-5 text-[#1B6EB5] mb-2" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-[#1F2A37]">Education & Study</h3>
                <p className="text-xs text-[#5A6471] mt-1 leading-relaxed">
                  Steady 2 Mbps access for online courses, exam preparation, and school resources.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#D9E1E8]">
                <Smartphone className="w-5 h-5 text-[#1B6EB5] mb-2" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-[#1F2A37]">Family & Livelihoods</h3>
                <p className="text-xs text-[#5A6471] mt-1 leading-relaxed">
                  Affordable daily and weekly passes for voice calls, market updates, and online services.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ + Contact CTA */}
      <section className="py-16 lg:py-20 bg-[#FFFFFF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2A37]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-[#D9E1E8] border-y border-[#D9E1E8]">
            {HOME_FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left font-medium text-[#1F2A37] py-1 min-h-[44px]"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#8A8D91] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#8A8D91] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-sm text-[#5A6471] leading-relaxed pr-6">{faq.a}</p>
                  )}
                </div>
              );
            })}
          </div>

          {(() => {
            const wa = resolveWhatsAppSupport(contact?.supportPhone);
            const email = resolveSupportEmail(contact?.supportEmail);
            return (
              <div className="mt-12 p-6 sm:p-8 rounded-2xl border border-[#D9E1E8] bg-[#F7FAFC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1F2A37]">
                    <HelpCircle className="w-4 h-4 text-[#1B6EB5]" aria-hidden="true" />
                    <span>Need assistance with registration, CNIC review, or device setup?</span>
                  </div>
                  <p className="text-sm text-[#5A6471]">
                    Message us on WhatsApp ({' '}
                    <a
                      href={wa.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1B6EB5] font-mono-data font-medium hover:underline"
                    >
                      {wa.display}
                    </a>
                    ) or email{' '}
                    <a href={`mailto:${email}`} className="text-[#1B6EB5] font-medium hover:underline">
                      {email}
                    </a>
                    .
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <a
                    href={wa.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#6DB33F] hover:bg-[#5D9F36] rounded-lg whitespace-nowrap min-h-[44px]"
                  >
                    WhatsApp Support
                  </a>
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#1B6EB5] hover:bg-[#155A92] rounded-lg whitespace-nowrap min-h-[44px]"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </section>
    </PublicLayout>
  );
}





































































































































































