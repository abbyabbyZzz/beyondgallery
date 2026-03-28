Copy your Marzipano export "tiles" folder contents here when using CUBE mode.

Expected layout:
  marzipano/tiles/0-p1/{z}/{f}/{y}/{x}.jpg
  marzipano/tiles/0-p1/preview.jpg
  ... through 7-p8

Enable cube tiles in exhibition/index.html (before other scripts), e.g.:
  <script>window.EXHIBITION_USE_CUBE_TILES = true;</script>

---

DEFAULT (no tiles): the site uses single-file equirectangular JPGs:
  ../360/location/p1.JPG … p8.JPG
Override folder with:
  <script>window.EXHIBITION_EQUIRECT_DIR = '../360/location/';</script>
Optional width hint for the viewer:
  <script>window.EXHIBITION_EQUIRECT_WIDTH = 8192;</script>
