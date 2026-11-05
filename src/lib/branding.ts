/**
 * Name and artwork of the app. The images are the college's own public
 * files on mccollege.edu (the same ones its home page uses for its favicon
 * and footer). To bundle copies instead, put the files under public/brand/
 * and point these paths at them.
 */
const WP = 'https://mccollege.edu/wp-content/uploads';
const MARK = `${WP}/2023/05/cropped-Midwestern_LogoVariations_512_x_512_clearBackground`;

export const BRAND = {
  name: 'Room calendar',
  org: 'Midwestern Career College',
  /** Square college mark on a clear background. */
  mark: `${MARK}-270x270.png`,
  /** Wide college logo, navy on a clear background, for light backgrounds. */
  logo: `${WP}/2020/12/Midwestern_LogoFinal2020.png`,
  /** Wide white college logo for the navy sign-in panel. */
  logoWhite: `${WP}/2021/02/footer-logo-300x63.png`,
  icons: {
    small: `${MARK}-32x32.png`,
    large: `${MARK}-192x192.png`,
    apple: `${MARK}-180x180.png`,
  },
};
