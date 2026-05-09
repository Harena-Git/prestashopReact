import { useState } from "react";
import Papa from "papaparse";
import { importCsvToPrestashop } from "../services/moduleImportationservice";
import { detectModuleFromCsvHeaders } from "../services/moduleDetection.service";
import ImportCsvButton from "../components/ImportCsvButton";

function ModuleImportPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // 1. Rehefa misy manisy fichier vaovao
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFeedback(null);
  };

  // 2. Fonction hikarakarana ny fanafarana (Importation)
  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setFeedback("Mikaroka ny module mifanaraka amin'io CSV io...");

    // 3. Mamaky ny lohatenin'ny CSV fotsiny (Headers)
    Papa.parse(file, {
      header: true,
      preview: 1, // Vakiana ny andalana voalohany fotsiny dia ampy hahitana ny lohateny
      complete: async (results) => {
        const headers = results.meta.fields;
        const detectedModule = detectModuleFromCsvHeaders(headers);

        // 4. Jerena raha nahita module mifanaraka aminy ny programa
        if (!detectedModule) {
          setFeedback("Tsy hita izay module mifanaraka amin'io fichier io.");
          setLoading(false);
          return;
        }

        setFeedback("Module '" + detectedModule + "' no hita. Eo am-pampidirana...");

        try {
          // 5. Mandefa ny fanafarana données (Importation)
          const result = await importCsvToPrestashop(file, detectedModule);
          
          const fahombiazana = result.successCount;
          const fahadisoana = result.errors.length;

          setFeedback("Vita: " + fahombiazana + " tafiditra, " + fahadisoana + " misy erreur.");
        } catch (err) {
          // 6. Raha nisy olana be teo am-pandefasana azy
          setFeedback("Nisy olana be: " + err.message);
        } finally {
          setLoading(false); // Atsahatra ny chargement
        }
      },
    });
  };

  return (
    <div>
      <h1>Importer des Données via CSV</h1>
      <p>Le module sera détecté automatiquement à partir des en-têtes.</p>
      
      <input type="file" accept=".csv" onChange={handleFileChange} />
      
      {/* Bouton fandefasana importation */}
      <ImportCsvButton 
        onImport={handleImport} 
        loading={loading} 
        disabled={!file} 
      />

      {/* Hafatra ho an'ny mpampiasa */}
      {feedback && <p>{feedback}</p>}
    </div>
  );
}

export default ModuleImportPage;
