// Real photographs from your own job sites, shown on the landing page.
//
// To add one:
//   1. Put the image in  public/site/real/   (jpg or webp, landscape, at least 1200px wide)
//   2. Add a line below with the file name and a short caption
//   3. Deploy — the strip appears automatically. While this list is empty, nothing renders.
//
// Only use photos you own or have permission to publish, and avoid shots where faces,
// licence plates, addresses or client paperwork are readable unless everyone pictured agreed.

export type SitePhoto = {
  /** File name inside public/site/real/ */
  file: string;
  /** Shown under the photo */
  caption: string;
  /** Describes the photo for screen readers and for when the image fails to load */
  alt: string;
};

export const SITE_PHOTOS: SitePhoto[] = [
  // { file: "dundas-framing.jpg", caption: "Dundas St — second floor framing", alt: "Two framers setting a wall on the second floor of a wood-framed house" },
];
