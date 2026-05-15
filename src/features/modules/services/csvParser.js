import Papa from "papaparse";

// Fonction de normalisation des en-têtes CSV (insensible à la casse et aux accents)
export function normalizeHeader(header) {
  if (!header) return "";
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .trim();
}

// Parse un fichier CSV et retourne un tableau de lignes (objets JS)
export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => normalizeHeader(header),
      complete: ({ data }) => resolve(data),
      error: (err) => reject(new Error(`Erreur CSV: ${err.message}`)),
    });
  });
}
