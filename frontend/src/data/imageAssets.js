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

const realProductPhotos = {
  smartphone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80',
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  tshirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
  sofa: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80',
  book: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80',
  laptop: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
  guitar: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=900&q=80',
  deskLamp: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
  keyboard: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80',
  runBag: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
  tablet: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80',
  hoodie: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80'
};

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
  smartphone: realProductPhotos.smartphone,
  smartphoneBack: realProductPhotos.smartphone,
  smartphoneSide: realProductPhotos.smartphone,
  headphones: realProductPhotos.headphones,
  headphonesCase: realProductPhotos.headphones,
  tshirt: realProductPhotos.tshirt,
  tshirtDetail: realProductPhotos.tshirt,
  shoes: realProductPhotos.shoes,
  shoesSide: realProductPhotos.shoes,
  sofa: realProductPhotos.sofa,
  sofaDetail: realProductPhotos.sofa,
  book: realProductPhotos.book,
  bookCover: realProductPhotos.book,
  usedLaptop: realProductPhotos.laptop,
  laptopOpen: realProductPhotos.laptop,
  guitar: realProductPhotos.guitar,
  guitarDetail: realProductPhotos.guitar,
  iphone: realProductPhotos.smartphone,
  macbook: realProductPhotos.laptop,
  airpods: realProductPhotos.headphones,
  ipad: realProductPhotos.tablet,
  deskLamp: realProductPhotos.deskLamp,
  keyboard: realProductPhotos.keyboard,
  runBag: realProductPhotos.runBag,
  hoodie: realProductPhotos.hoodie
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
  detailOne: realProductPhotos.smartphone,
  detailTwo: realProductPhotos.headphones
};

export const fallbackImages = {
  product: noImage,
  avatar: avatarImages.userDefault
};
