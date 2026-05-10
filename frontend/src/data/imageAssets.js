const createSvgDataUri = ({
  width = 640,
  height = 480,
  background = ['#f8fafc', '#dbeafe'],
  body
}) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${background[0]}"/>
          <stop offset="100%" stop-color="${background[1]}"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="${width * 0.16}" cy="${height * 0.18}" r="${Math.min(width, height) * 0.12}" fill="#ffffff" opacity="0.32"/>
      <circle cx="${width * 0.88}" cy="${height * 0.82}" r="${Math.min(width, height) * 0.18}" fill="#ffffff" opacity="0.24"/>
      ${body}
    </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const phoneFront = createSvgDataUri({
  background: ['#e0f2fe', '#f8fafc'],
  body: `
    <g filter="url(#shadow)" transform="translate(220 44)">
      <rect width="200" height="392" rx="38" fill="#111827"/>
      <rect x="16" y="28" width="168" height="326" rx="28" fill="#0ea5e9"/>
      <rect x="16" y="28" width="168" height="326" rx="28" fill="#111827" opacity="0.18"/>
      <circle cx="100" cy="366" r="10" fill="#374151"/>
      <rect x="72" y="14" width="56" height="8" rx="4" fill="#374151"/>
      <circle cx="58" cy="80" r="22" fill="#ffffff" opacity="0.32"/>
      <rect x="52" y="148" width="96" height="14" rx="7" fill="#ffffff" opacity="0.42"/>
      <rect x="70" y="178" width="60" height="10" rx="5" fill="#ffffff" opacity="0.28"/>
    </g>`
});

const phoneBack = createSvgDataUri({
  background: ['#f0f9ff', '#dbeafe'],
  body: `
    <g filter="url(#shadow)" transform="translate(222 44)">
      <rect width="196" height="392" rx="38" fill="#f8fafc"/>
      <rect x="20" y="20" width="76" height="92" rx="24" fill="#1f2937"/>
      <circle cx="48" cy="50" r="17" fill="#0f172a"/>
      <circle cx="70" cy="80" r="17" fill="#0f172a"/>
      <circle cx="74" cy="46" r="8" fill="#93c5fd"/>
      <circle cx="48" cy="50" r="7" fill="#60a5fa"/>
      <circle cx="70" cy="80" r="7" fill="#60a5fa"/>
      <rect x="48" y="172" width="100" height="14" rx="7" fill="#cbd5e1"/>
      <rect x="66" y="202" width="64" height="10" rx="5" fill="#e2e8f0"/>
    </g>`
});

const phoneSide = createSvgDataUri({
  background: ['#eef2ff', '#f8fafc'],
  body: `
    <g filter="url(#shadow)" transform="translate(126 126)">
      <rect x="0" y="94" width="388" height="42" rx="21" fill="#111827"/>
      <rect x="22" y="104" width="344" height="22" rx="11" fill="#64748b"/>
      <rect x="76" y="54" width="236" height="46" rx="20" fill="#0ea5e9" opacity="0.78"/>
      <circle cx="92" cy="77" r="7" fill="#e0f2fe"/>
      <circle cx="296" cy="77" r="7" fill="#e0f2fe"/>
    </g>`
});

const headphones = createSvgDataUri({
  background: ['#fff7ed', '#ffedd5'],
  body: `
    <g filter="url(#shadow)" transform="translate(126 70)">
      <path d="M86 214v-68c0-92 72-146 188-146s188 54 188 146v68" fill="none" stroke="#111827" stroke-width="34" stroke-linecap="round"/>
      <path d="M126 152c18-66 72-102 148-102s130 36 148 102" fill="none" stroke="#475569" stroke-width="18" stroke-linecap="round"/>
      <rect x="40" y="178" width="108" height="138" rx="36" fill="#0f172a"/>
      <rect x="400" y="178" width="108" height="138" rx="36" fill="#0f172a"/>
      <rect x="66" y="204" width="54" height="86" rx="22" fill="#fb923c"/>
      <rect x="428" y="204" width="54" height="86" rx="22" fill="#fb923c"/>
    </g>`
});

const earbuds = createSvgDataUri({
  background: ['#f8fafc', '#e0f2fe'],
  body: `
    <g filter="url(#shadow)" transform="translate(164 86)">
      <rect x="54" y="172" width="260" height="130" rx="44" fill="#ffffff"/>
      <rect x="92" y="206" width="184" height="12" rx="6" fill="#e2e8f0"/>
      <circle cx="128" cy="84" r="48" fill="#ffffff"/>
      <circle cx="240" cy="84" r="48" fill="#ffffff"/>
      <rect x="118" y="112" width="26" height="96" rx="13" fill="#ffffff"/>
      <rect x="228" y="112" width="26" height="96" rx="13" fill="#ffffff"/>
      <circle cx="140" cy="84" r="12" fill="#cbd5e1"/>
      <circle cx="228" cy="84" r="12" fill="#cbd5e1"/>
    </g>`
});

const tshirt = createSvgDataUri({
  background: ['#fdf2f8', '#fae8ff'],
  body: `
    <g filter="url(#shadow)" transform="translate(122 72)">
      <path d="M132 0h152l58 48 74 22-46 106-58-18v218H104V158l-58 18L0 70l74-22z" fill="#ec4899"/>
      <path d="M132 0c16 36 44 54 76 54s60-18 76-54" fill="#be185d" opacity="0.45"/>
      <path d="M128 142h160" stroke="#fce7f3" stroke-width="18" stroke-linecap="round" opacity="0.75"/>
      <path d="M152 190h112" stroke="#fce7f3" stroke-width="14" stroke-linecap="round" opacity="0.6"/>
    </g>`
});

const fabricDetail = createSvgDataUri({
  background: ['#fff1f2', '#fce7f3'],
  body: `
    <g filter="url(#shadow)" transform="translate(104 132)">
      <path d="M0 126c76-74 160-102 252-84 84 16 138-2 180-42v210H0z" fill="#fb7185"/>
      <path d="M44 132c78-46 154-60 228-42 54 14 106 8 158-18" fill="none" stroke="#ffe4e6" stroke-width="16" stroke-linecap="round" opacity="0.72"/>
      <path d="M68 176c76-30 152-34 228-10" fill="none" stroke="#be123c" stroke-width="10" stroke-linecap="round" opacity="0.25"/>
    </g>`
});

const shoes = createSvgDataUri({
  background: ['#ecfeff', '#d1fae5'],
  body: `
    <g filter="url(#shadow)" transform="translate(82 150)">
      <path d="M38 126c54-22 112-64 156-118 92 12 152 78 202 128l70 20c30 8 46 28 44 56H4c-8-38 8-70 34-86z" fill="#0f172a"/>
      <path d="M76 132c44-18 90-52 126-94 76 16 126 62 170 106H76z" fill="#22c55e"/>
      <path d="M4 212h506c-6 26-26 42-58 42H60c-32 0-52-16-56-42z" fill="#ffffff"/>
      <path d="M196 72l-42 52M238 90l-42 52M280 112l-42 52" stroke="#e0f2fe" stroke-width="10" stroke-linecap="round"/>
    </g>`
});

const shoeSide = createSvgDataUri({
  background: ['#f0fdfa', '#ecfccb'],
  body: `
    <g filter="url(#shadow)" transform="translate(76 160)">
      <path d="M28 126c78-12 150-50 216-114 94 18 158 70 210 126 42 8 66 28 70 62H0c-2-30 8-56 28-74z" fill="#14b8a6"/>
      <path d="M88 130c52-14 100-44 146-90 66 12 116 48 160 94H88z" fill="#99f6e4"/>
      <path d="M0 200h524v34c0 12-10 22-22 22H22c-12 0-22-10-22-22z" fill="#111827"/>
      <rect x="62" y="208" width="390" height="16" rx="8" fill="#f8fafc"/>
    </g>`
});

const sofa = createSvgDataUri({
  background: ['#fef3c7', '#fde68a'],
  body: `
    <g filter="url(#shadow)" transform="translate(88 122)">
      <rect x="44" y="110" width="380" height="150" rx="34" fill="#b45309"/>
      <rect x="78" y="48" width="314" height="134" rx="36" fill="#d97706"/>
      <rect x="0" y="120" width="98" height="132" rx="34" fill="#92400e"/>
      <rect x="370" y="120" width="98" height="132" rx="34" fill="#92400e"/>
      <rect x="110" y="72" width="112" height="92" rx="22" fill="#f59e0b"/>
      <rect x="246" y="72" width="112" height="92" rx="22" fill="#f59e0b"/>
      <rect x="92" y="252" width="40" height="46" rx="12" fill="#78350f"/>
      <rect x="338" y="252" width="40" height="46" rx="12" fill="#78350f"/>
    </g>`
});

const sofaDetail = createSvgDataUri({
  background: ['#fff7ed', '#fed7aa'],
  body: `
    <g filter="url(#shadow)" transform="translate(116 110)">
      <rect width="408" height="260" rx="36" fill="#d97706"/>
      <path d="M44 70h320M44 130h320M44 190h320" stroke="#fed7aa" stroke-width="14" stroke-linecap="round" opacity="0.62"/>
      <path d="M120 24v212M204 24v212M288 24v212" stroke="#92400e" stroke-width="10" opacity="0.22"/>
    </g>`
});

const book = createSvgDataUri({
  background: ['#eff6ff', '#e0e7ff'],
  body: `
    <g filter="url(#shadow)" transform="translate(166 68)">
      <path d="M54 0h258c24 0 44 20 44 44v296c0 24-20 44-44 44H54c-30 0-54-24-54-54V54C0 24 24 0 54 0z" fill="#2563eb"/>
      <rect x="54" y="0" width="34" height="384" fill="#1d4ed8"/>
      <rect x="114" y="82" width="166" height="22" rx="11" fill="#bfdbfe"/>
      <rect x="114" y="126" width="126" height="16" rx="8" fill="#dbeafe" opacity="0.85"/>
      <rect x="114" y="268" width="178" height="12" rx="6" fill="#93c5fd"/>
      <path d="M54 342h258c12 0 22 10 22 22s-10 22-22 22H54c-18 0-32-10-32-22s14-22 32-22z" fill="#f8fafc"/>
    </g>`
});

const bookCover = createSvgDataUri({
  background: ['#eef2ff', '#dbeafe'],
  body: `
    <g filter="url(#shadow)" transform="translate(150 76)">
      <rect width="340" height="330" rx="26" fill="#1d4ed8"/>
      <rect x="28" y="28" width="284" height="274" rx="18" fill="#3b82f6"/>
      <path d="M72 92h196M72 132h154M72 224h196" stroke="#dbeafe" stroke-width="18" stroke-linecap="round"/>
      <rect x="74" y="166" width="88" height="34" rx="17" fill="#facc15"/>
    </g>`
});

const laptop = createSvgDataUri({
  background: ['#f1f5f9', '#e2e8f0'],
  body: `
    <g filter="url(#shadow)" transform="translate(74 90)">
      <rect x="92" y="0" width="308" height="218" rx="24" fill="#111827"/>
      <rect x="112" y="20" width="268" height="168" rx="12" fill="#38bdf8"/>
      <rect x="0" y="226" width="492" height="54" rx="20" fill="#cbd5e1"/>
      <rect x="194" y="238" width="104" height="14" rx="7" fill="#94a3b8"/>
      <path d="M24 280h444c-10 18-28 28-54 28H78c-26 0-44-10-54-28z" fill="#94a3b8"/>
    </g>`
});

const laptopOpen = createSvgDataUri({
  background: ['#ecfeff', '#e0f2fe'],
  body: `
    <g filter="url(#shadow)" transform="translate(70 78)">
      <rect x="76" y="0" width="340" height="236" rx="24" fill="#1f2937"/>
      <rect x="100" y="24" width="292" height="174" rx="12" fill="#0ea5e9"/>
      <rect x="0" y="244" width="492" height="70" rx="24" fill="#e5e7eb"/>
      <path d="M70 270h352" stroke="#94a3b8" stroke-width="10" stroke-linecap="round" opacity="0.65"/>
      <rect x="204" y="258" width="84" height="18" rx="9" fill="#cbd5e1"/>
    </g>`
});

const guitar = createSvgDataUri({
  background: ['#fff7ed', '#ffedd5'],
  body: `
    <g filter="url(#shadow)" transform="translate(152 52) rotate(-16 180 190)">
      <rect x="236" y="0" width="42" height="238" rx="18" fill="#92400e"/>
      <rect x="222" y="-14" width="72" height="38" rx="12" fill="#78350f"/>
      <path d="M116 200c-50-16-84-54-84-100C32 44 82 0 144 0c38 0 72 17 92 44 20-27 54-44 92-44 62 0 112 44 112 100 0 46-34 84-84 100 18 24 28 52 28 82 0 74-66 134-148 134S88 356 88 282c0-30 10-58 28-82z" fill="#d97706"/>
      <circle cx="236" cy="214" r="48" fill="#78350f"/>
      <circle cx="236" cy="214" r="30" fill="#111827"/>
      <path d="M257 20v330M246 20v330M268 20v330" stroke="#fde68a" stroke-width="4"/>
    </g>`
});

const guitarDetail = createSvgDataUri({
  background: ['#fffbeb', '#fed7aa'],
  body: `
    <g filter="url(#shadow)" transform="translate(118 96)">
      <ellipse cx="202" cy="156" rx="190" ry="136" fill="#d97706"/>
      <circle cx="202" cy="156" r="62" fill="#78350f"/>
      <circle cx="202" cy="156" r="42" fill="#111827"/>
      <rect x="0" y="140" width="404" height="26" rx="13" fill="#92400e"/>
      <path d="M24 126h356M24 142h356M24 158h356M24 174h356" stroke="#fde68a" stroke-width="3"/>
    </g>`
});

const ipad = createSvgDataUri({
  background: ['#f8fafc', '#e0e7ff'],
  body: `
    <g filter="url(#shadow)" transform="translate(170 54)">
      <rect width="300" height="372" rx="34" fill="#111827"/>
      <rect x="24" y="32" width="252" height="292" rx="16" fill="#818cf8"/>
      <rect x="78" y="112" width="144" height="20" rx="10" fill="#eef2ff" opacity="0.74"/>
      <rect x="102" y="152" width="96" height="14" rx="7" fill="#eef2ff" opacity="0.48"/>
      <circle cx="150" cy="348" r="9" fill="#374151"/>
    </g>`
});

const noImage = createSvgDataUri({
  background: ['#f8fafc', '#e2e8f0'],
  body: `
    <g filter="url(#shadow)" transform="translate(190 116)">
      <rect width="260" height="220" rx="34" fill="#ffffff"/>
      <path d="M70 88h120l34 68H36z" fill="#cbd5e1"/>
      <circle cx="92" cy="70" r="30" fill="#94a3b8"/>
      <rect x="66" y="174" width="128" height="16" rx="8" fill="#e2e8f0"/>
    </g>`
});

const avatar = (background, shirt) => createSvgDataUri({
  width: 160,
  height: 160,
  background,
  body: `
    <g transform="translate(20 18)">
      <circle cx="60" cy="46" r="34" fill="#f8fafc"/>
      <path d="M0 142c8-42 32-64 60-64s52 22 60 64z" fill="${shirt}"/>
      <circle cx="48" cy="44" r="5" fill="#334155"/>
      <circle cx="72" cy="44" r="5" fill="#334155"/>
      <path d="M46 62c10 8 20 8 30 0" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
    </g>`
});

const shopLogo = createSvgDataUri({
  width: 180,
  height: 180,
  background: ['#eff6ff', '#dbeafe'],
  body: `
    <g filter="url(#shadow)" transform="translate(30 38)">
      <path d="M18 42h84l18 32H0z" fill="#2563eb"/>
      <rect x="12" y="72" width="96" height="72" rx="14" fill="#ffffff"/>
      <rect x="32" y="94" width="24" height="50" rx="6" fill="#dbeafe"/>
      <rect x="68" y="92" width="24" height="24" rx="6" fill="#93c5fd"/>
    </g>`
});

const shopBanner = createSvgDataUri({
  width: 1200,
  height: 300,
  background: ['#eff6ff', '#fef9c3'],
  body: `
    <g filter="url(#shadow)" transform="translate(92 68)">
      <rect x="0" y="74" width="1016" height="134" rx="28" fill="#ffffff"/>
      <path d="M70 0h876l70 90H0z" fill="#2563eb"/>
      <path d="M88 0h116l-34 90H54zM320 0h116l-34 90H286zM552 0h116l-34 90H518zM784 0h116l-34 90H750z" fill="#60a5fa"/>
      <rect x="96" y="118" width="150" height="90" rx="16" fill="#dbeafe"/>
      <rect x="316" y="112" width="118" height="96" rx="16" fill="#fed7aa"/>
      <rect x="504" y="118" width="190" height="18" rx="9" fill="#94a3b8"/>
      <rect x="504" y="154" width="150" height="14" rx="7" fill="#cbd5e1"/>
      <rect x="810" y="116" width="98" height="92" rx="18" fill="#bbf7d0"/>
    </g>`
});

export const productImages = {
  smartphone: phoneFront,
  smartphoneBack: phoneBack,
  smartphoneSide: phoneSide,
  headphones,
  headphonesCase: earbuds,
  tshirt,
  tshirtDetail: fabricDetail,
  shoes,
  shoesSide: shoeSide,
  sofa,
  sofaDetail,
  book,
  bookCover,
  usedLaptop: laptop,
  laptopOpen,
  guitar,
  guitarDetail,
  iphone: phoneBack,
  macbook: laptopOpen,
  airpods: earbuds,
  ipad
};

export const avatarImages = {
  sellerTech: avatar(['#e0f2fe', '#dbeafe'], '#2563eb'),
  sellerFashion: avatar(['#fdf2f8', '#fae8ff'], '#db2777'),
  sellerHome: avatar(['#fff7ed', '#fed7aa'], '#ea580c'),
  sellerBook: avatar(['#eef2ff', '#dbeafe'], '#4f46e5'),
  sellerPersonal: avatar(['#f0fdfa', '#ccfbf1'], '#0f766e'),
  userDefault: avatar(['#f8fafc', '#e2e8f0'], '#64748b'),
  userOne: avatar(['#ecfeff', '#cffafe'], '#0891b2'),
  userTwo: avatar(['#fef3c7', '#fde68a'], '#ca8a04'),
  userThree: avatar(['#dcfce7', '#bbf7d0'], '#16a34a')
};

export const shopImages = {
  logo: shopLogo,
  banner: shopBanner
};

export const reviewImages = {
  detailOne: phoneSide,
  detailTwo: phoneBack
};

export const fallbackImages = {
  product: noImage,
  avatar: avatarImages.userDefault
};
