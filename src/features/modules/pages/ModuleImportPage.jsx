import { useState } from "react";
import Papa from "papaparse";
import { importCsvToPrestashop } from "../services/moduleImportationservice";
import { detectModuleFromCsvHeaders } from "../services/moduleDetection.service";
import ImportCsvButton from "../components/ImportCsvButton";

function ModuleImportPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFeedback(null);
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setFeedback("Détection du module en cours...");

    // Lecture des en-têtes du CSV pour la détection
    Papa.parse(file, {
      header: true,
      step: (results, parser) => {
        parser.abort(); // On arrête après avoir lu la première ligne
        const headers = results.meta.fields;
        const detectedModule = detectModuleFromCsvHeaders(headers);

        if (!detectedModule) {
          setFeedback("Impossible de détecter automatiquement le module pour ce fichier CSV.");
          setLoading(false);
          return;
        }
        
        setFeedback(`Module "${detectedModule}" détecté. Importation en cours...`);

        // Lancer l'importation avec le module détecté
        importCsvToPrestashop(file, detectedModule)
          .then(({ successCount, errors }) => {
            setFeedback(
              `Importation terminée : ${successCount} succès, ${errors.length} erreurs.`
            );
          })
          .catch((err) => {
            setFeedback(`Erreur critique : ${err.message}`);
          })
          .finally(() => {
            setLoading(false);
          });
      },
    });
  };

  return (
    <div>
      <h1>Importer des Données via CSV</h1>
      <p>Le module (products, customers, etc.) sera détecté automatiquement à partir des en-têtes de votre fichier.</p>
      
      <input type="file" accept=".csv" onChange={handleFileChange} />
      
      <ImportCsvButton onImport={handleImport} loading={loading} disabled={!file} />

      {feedback && <p>{feedback}</p>}
    </div>
  );
}

export default ModuleImportPage;
