// All editable copy and business details in one place.
// Anything in [square brackets] is a placeholder to fill in before launch.

export const site = {
  name: 'Vectr',
  url: 'https://www.vectr.uk',
  title: 'Vectr | Networks, Security & AV Systems — Berkshire, Hampshire, Oxfordshire & Wiltshire',
  description:
    'Integrated networking, Wi-Fi, CCTV, alarms and audio-visual (AV) systems for homes and workplaces across Berkshire, Hampshire, Oxfordshire and Wiltshire. Designed, installed and supported.',
  tagline: 'Making technology simple.',
  phoneDisplay: '07766 822280',
  phoneIntl: '+44 (0)7766 822280',
  phoneHref: 'tel:+447766822280',
  email: 'info@vectr.uk',
  privacyEmail: 'admin@vectr.uk',
  areas: ['Berkshire', 'Hampshire', 'Oxfordshire', 'Wiltshire'],
  hours: 'Mon–Fri 9:00am – 5:00pm, Sat by appointment',
  supportPlan: '[Plan details / price]',
  googleReviewsUrl: 'https://g.page/r/CcLDJv5Fn69-EAE/review',
};

export const services = [
  { title: 'Wi-Fi & networking', text: 'Whole-home and whole-site UniFi Wi-Fi that simply works, in every room.' },
  { title: 'Structured cabling', text: 'Cat6 runs, wall racks and patching — the backbone, done properly.' },
  { title: 'CCTV & alarms', text: 'Professional-grade cameras and intrusion alarms, with clear data protection paperwork for owners.' },
  { title: 'Audio & video', text: 'Multi-room audio, TVs and home cinema — beautifully integrated and simple to use.' },
  { title: 'Community & guest Wi-Fi', text: 'Open networks for village halls and venues, with the GDPR documentation included.' },
  { title: 'Support & maintenance', text: 'Ongoing care, so your technology keeps performing at its best.' },
];

export const steps = [
  { title: 'Survey & design', text: "We map coverage before we install, so you see exactly what you're getting." },
  { title: 'A tailored install', text: 'Built around your home and budget. We re-use your equipment where practicable.' },
  { title: 'A clear handover', text: "You'll know how it works and what to do — no jargon left behind." },
  { title: 'Support that continues', text: 'Help when you need it, long after install day.' },
];


// `height` is the display height in px, tuned so every logo carries a similar visual width.
// Brands without a logo file fall back to grey text.
export const brands: { name: string; logo?: string; height?: number }[] = [
  { name: 'Ubiquiti UniFi', logo: 'ubiquiti', height: 35 },
  { name: 'Dahua', logo: 'dahua', height: 44 },
  { name: 'Ajax', logo: 'ajax', height: 30 },
  { name: 'Sonos' },
];

export const interests = [
  { value: 'wifi', label: 'Wi-Fi & networking' },
  { value: 'cctv', label: 'CCTV & alarms' },
  { value: 'av', label: 'Audio & video' },
  { value: 'community', label: 'Community / guest WiFi' },
  { value: 'support', label: 'Support for an existing system' },
  { value: 'other', label: 'Something else' },
];

export const timeSlots = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Early evening' },
];
