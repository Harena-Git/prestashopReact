import JSZip from "jszip";
import { getProductInfo, findProductByReference } from "./prestashopCache";

const API_KEY = "3dK1We529zTiCrg7i9TZ3N5MTAcD1MAb";

// Types MIME supportés par PrestaShop
const MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

// Upload une image vers un produit PrestaShop
async function uploadImage(productId, imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await fetch(
    `/api/images/products/${productId}?ws_key=${API_KEY}`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} - ${text.substring(0, 300)}`);
  }

  return await response.text();
}

// Extrait les images d'un ZIP et les importe dans PrestaShop
// Le nom de chaque image = référence produit (ex: T_01.png → produit T_01)
export async function importImages(zipFile, log) {
  const errors = [];
  let inserted = 0;

  // Lire le fichier ZIP
  const zip = await JSZip.loadAsync(zipFile);

  // Collecter les images en ignorant les métadonnées macOS (__MACOSX, ._ )
  const images = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;

    const filename = path.split("/").pop();
    if (!filename || filename.startsWith("._") || path.includes("__MACOSX")) return;

    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex < 0) return;

    const ext = filename.slice(dotIndex + 1).toLowerCase();
    if (!MIME_TYPES[ext]) return;

    // Référence = nom du fichier sans extension, en majuscules
    const reference = filename.slice(0, dotIndex).toUpperCase();
    images.push({ reference, filename, ext, entry });
  });

  log(`  ${images.length} image(s) trouvée(s) dans le ZIP`);

  for (const { reference, filename, ext, entry } of images) {
    try {
      // 1. Chercher le produit dans le cache (import en cours) ou via l'API
      let productInfo = getProductInfo(reference);
      if (!productInfo) {
        const productId = await findProductByReference(reference);
        if (!productId) throw new Error(`Produit "${reference}" introuvable`);
        productInfo = { id: productId };
      }

      log(`  Image "${filename}" → produit "${reference}" (ID ${productInfo.id})...`);

      // 2. Convertir l'entrée ZIP en File
      const blob = await entry.async("blob");
      const imageFile = new File([blob], filename, { type: MIME_TYPES[ext] });

      // 3. Envoyer à l'API PrestaShop
      await uploadImage(productInfo.id, imageFile);

      log(`  ✓ Image "${filename}" importée`);
      inserted++;
    } catch (err) {
      errors.push(`"${filename}": ${err.message}`);
      log(`  ✗ "${filename}": ${err.message}`);
    }
  }

  return { inserted, total: images.length, errors };
}
