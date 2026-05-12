import Papa from "papaparse";

// Parse un fichier CSV et retourne un tableau de lignes (objets JS)
export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => resolve(data),
      error: (err) => reject(new Error(`Erreur CSV: ${err.message}`)),
    });
  });
}
