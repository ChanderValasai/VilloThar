import { Link } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout';

const STEPS = [
  {
    num: '01',
    title: 'Connect to VilloThar Wi-Fi',
    detail:
      'Open Wi-Fi settings on your phone or computer inside Pabohar and select the VilloThar SSID.',
  },
  {
    num: '02',
    title: 'Open the Captive Portal',
    detail:
      'Your device automatically opens the lightweight VilloThar captive portal login and onboarding page.',
  },
  {
    num: '03',
    title: 'Register Customer Account',
    detail:
      'Enter your full name, 13-digit CNIC number, mobile number, village, and password, and accept identity-verification consent.',
  },
  {
    num: '04',
    title: 'Verify Identity',
    detail:
      'The backend checks CNIC format and routes verification through the authorized NADRA integration channel (or operator review while pilot authorization is finalized).',
  },
  {
    num: '05',
    title: 'Register Device & Associate MAC',
    detail:
      'Register your phone or laptop so its Wi-Fi MAC address is bound to your device record through the network gateway integration.',
  },
  {
    num: '06',
    title: 'Choose a Package for That Device',
    detail:
      'Pick Daily (Rs 50), Weekly (Rs 200), Biweekly (Rs 350), or Monthly (Rs 600) at 2 Mbps. Remember: one package serves only one device.',
  },
  {
    num: '07',
    title: 'Complete Payment',
    detail:
      'Pay via the configured payment method. The backend waits for verified gateway confirmation before activating any subscription.',
  },
  {
    num: '08',
    title: 'Network Authorization & Access',
    detail:
      'Once payment and eligibility checks pass, the network authorization system enables 2 Mbps access on any supported VilloThar router in your village until expiry.',
  },
];

export function HowItWorksPage() {
  return (
    <PublicLayout>
      <section className="py-12 lg:py-16 bg-[#FFFFFF] border-b border-[#E2E0DA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-3">
          <p className="text-xs font-medium text-[#0B66A8]">Captive Portal Onboarding Guide</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#132238] text-balance">
            How to register, verify, and connect your device
          </h1>
          <p className="text-base text-[#475569] max-w-2xl leading-relaxed">
            Follow the eight-step flow from joining VilloThar Wi-Fi to active 2 Mbps internet access.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-5 space-y-2"
              >
                <span className="font-mono-data text-xs font-semibold text-[#0B66A8]">
                  STEP {s.num}
                </span>
                <h2 className="font-display text-base font-bold text-[#132238]">{s.title}</h2>
                <p className="text-sm text-[#475569] leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-3">
              <h2 className="font-display text-lg font-bold text-[#132238]">
                About MAC Addresses & Modern Smartphones
              </h2>
              <p className="text-sm text-[#475569] leading-relaxed">
                Your phone or laptop identifies itself to village Wi-Fi routers using a MAC address. Modern Android phones and iPhones often turn on &ldquo;Private&rdquo; or &ldquo;Randomized MAC&rdquo; by default.
              </p>
              <p className="text-sm text-[#475569] leading-relaxed">
                For consistent authorization on VilloThar, keep the same Wi-Fi MAC setting enabled for the VilloThar network (or select &ldquo;Use Device MAC&rdquo; in your phone&apos;s VilloThar Wi-Fi settings). If your phone changes its MAC address, you can update it inside the Customer Portal.
              </p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E0DA] rounded-xl p-6 space-y-3">
              <h2 className="font-display text-lg font-bold text-[#132238]">
                Device-Locked Packages & Renewal
              </h2>
              <p className="text-sm text-[#475569] leading-relaxed">
                Each package is tied to one registered device—not to a single router and not shared across multiple devices. You can move around Pabohar between supported VilloThar access points with the same device.
              </p>
              <p className="text-sm text-[#475569] leading-relaxed">
                When your validity expires, internet access pauses automatically and the captive portal displays a one-tap renewal option for that device.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/captive"
              className="px-5 py-3 text-sm font-semibold text-white bg-[#0B66A8] hover:bg-[#085186] rounded-lg min-h-[44px] inline-flex items-center"
            >
              Launch Captive Portal Experience
            </Link>
            <Link
              to="/portal/register"
              className="px-5 py-3 text-sm font-semibold text-[#132238] bg-[#FFFFFF] border border-[#E2E0DA] hover:bg-[#F3F1EC] rounded-lg min-h-[44px] inline-flex items-center"
            >
              Register Customer Account
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
