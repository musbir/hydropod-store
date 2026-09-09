/** Merchant-facing branding and the distributor attribution shown site-wide. */
export const site = {
  name: 'AquaPure Systems',
  tagline: 'Authorised water-treatment dealer',
  description:
    'Water softeners, whole-house filtration, DM water systems and point-of-use cartridges for Indian homes, labs and light industry.',
  phone: '+91 80 4718 2200',
  email: 'orders@aquapure.example',
  gstin: '29AAFCA1234M1Z5',
  address: 'No. 14, Industrial Layout, Peenya, Bengaluru 560058, Karnataka',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://hydropod-store.vercel.app',
};

/** The upstream brand whose catalog and imagery this storefront resells. */
export const distributor = {
  brand: 'Hydropod',
  parent: 'Doshion',
  site: 'https://hydropod.in',
  catalogSource: 'https://hydropod.in/products.json',
};
