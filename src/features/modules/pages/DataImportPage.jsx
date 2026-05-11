/**
 * PAGE D'IMPORT DE DONNÉES PRESTASHOP
 * 
 * Permet d'importer les 3 fichiers CSV métier:
 * - Fichier 1 : Produits
 * - Fichier 2 : Déclinaisons & Stock
 * - Fichier 3 : Clients & Commandes
 * 
 * Flux: Upload → Mapping → Validation → Insertion (All or Nothing)
 */

import { useState } from "react";
import transactionalDataImportService from "../services/transactionalDataImportService";
import "./DataImportPage.css";

function DataImportPage() {
  // État des fichiers (3 fichiers: produits, déclinaisons, transactions)
  const [files, setFiles] = useState({
    fichier1_products: null,
    fichier2_combinations: null,
    fichier3_transactions: null,
  });

  // État du chargement
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState([]);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("fichier1_products");

  /**
   * Gérer la sélection de fichier
   */
  const handleFileSelect = (fileType, file) => {
    setFiles((prev) => ({
      ...prev,
      [fileType]: file,
    }));
  };

  /**
   * Valider les fichiers sélectionnés
   */
  const validateFilesSelected = () => {
    const selectedFiles = Object.entries(files).filter(
      ([_, file]) => file !== null
    );

    if (selectedFiles.length === 0) {
      return {
        valid: false,
        message: "Veuillez sélectionner au moins un fichier.",
      };
    }

    return { valid: true };
  };

  /**
   * MAIN : Lancer l'import
   */
  const handleImportAll = async () => {
    const validation = validateFilesSelected();
    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    setImporting(true);
    setImportLog([]);
    setResults(null);

    const allResults = [];
    let hasErrors = false;

    try {
      // Importer chaque fichier dans l'ordre
      for (const [fileType, file] of Object.entries(files)) {
        if (!file) continue;

        console.log(`\n📂 Importation: ${fileType}`);
        setImportLog((prev) => [
          ...prev,
          `📂 Début importation: ${fileType}...`,
        ]);

        // ÉTAPE : Import transactionnel
        const importResult = await transactionalDataImportService.importDataFile(
          file,
          fileType
        );

        // Mettre à jour le log
        setImportLog((prev) => [
          ...prev,
          ...importResult.log,
        ]);

        allResults.push(importResult);

        // Vérifier s'il y a eu erreur
        if (!importResult.success) {
          hasErrors = true;
          console.error(`❌ Erreur ${fileType}: ${importResult.error}`);

          // ALL or NOTHING: s'il y a une erreur, arrêter
          break;
        }
      }

      // Résultat final
      setResults({
        success: !hasErrors,
        allResults,
        summary: {
          totalFiles: allResults.length,
          successfulFiles: allResults.filter((r) => r.success).length,
          failedFiles: allResults.filter((r) => !r.success).length,
        },
      });

    } catch (err) {
      console.error("Erreur import général:", err);
      setImportLog((prev) => [
        ...prev,
        `❌ ERREUR: ${err.message}`,
      ]);
      setResults({
        success: false,
        error: err.message,
      });
    } finally {
      setImporting(false);
    }
  };

  /**
   * Afficher un fichier d'import
   */
  const FileUploadSection = ({ fileType, label, description }) => (
    <div className="file-upload-section">
      <h3>{label}</h3>
      <p className="description">{description}</p>

      <div className="file-input-wrapper">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => handleFileSelect(fileType, e.target.files[0])}
          disabled={importing}
          id={`file-${fileType}`}
        />
        <label htmlFor={`file-${fileType}`} className="file-label">
          {files[fileType] ? (
            <>
              ✓ Sélectionné: <strong>{files[fileType].name}</strong>
            </>
          ) : (
            "Choisir un fichier CSV..."
          )}
        </label>
      </div>

      {files[fileType] && (
        <button
          onClick={() => handleFileSelect(fileType, null)}
          className="btn-remove"
          disabled={importing}
        >
          Retirer le fichier
        </button>
      )}
    </div>
  );

  return (
    <div className="data-import-page">
      <div className="header">
        <h1>🗂️ Import de Données Prestashop</h1>
        <p>
          Importez vos 3 fichiers CSV en respectant l'ordre:
          <br />
          <strong>1.</strong> Fichier 1 (Produits) →
          <strong>2.</strong> Fichier 2 (Déclinaisons & Stock) →
          <strong>3.</strong> Fichier 3 (Clients & Commandes)
        </p>
      </div>

      <div className="import-container">
        {/* Section fichiers */}
        <div className="files-section">
          <FileUploadSection
            fileType="fichier1_products"
            label="📦 Fichier 1 : Produits"
            description="Colonnes: date_availability_produit, nom, reference, prix_ttc, Taxe, categorie, prix_achat"
          />

          <FileUploadSection
            fileType="fichier2_combinations"
            label="🔀 Fichier 2 : Déclinaisons & Stock"
            description="Colonnes: reference, specificité, karazany, stock_initial, prix_vente_ttc"
          />

          <FileUploadSection
            fileType="fichier3_transactions"
            label="👥📋 Fichier 3 : Clients & Commandes"
            description="Colonnes: date, nom, email, pwd, adresse, achat, etat"
          />
        </div>

        {/* Bouton d'import */}
        <div className="import-controls">
          <button
            onClick={handleImportAll}
            disabled={importing || Object.values(files).every((f) => !f)}
            className={`btn-import ${importing ? "loading" : ""}`}
          >
            {importing ? "Importation en cours..." : "🚀 Lancer l'import"}
          </button>
        </div>

        {/* Log en direct */}
        {importLog.length > 0 && (
          <div className="log-section">
            <h3>📜 Journaux d'import</h3>
            <div className="log-viewer">
              {importLog.map((entry, idx) => (
                <div
                  key={idx}
                  className={`log-entry ${
                    entry.includes("✓")
                      ? "success"
                      : entry.includes("✗")
                        ? "error"
                        : entry.includes("📝")
                          ? "info"
                          : ""
                  }`}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résultats */}
        {results && (
          <div className={`results-section ${results.success ? "success" : "error"}`}>
            <h3>
              {results.success
                ? "✅ Import réussi !"
                : "❌ Erreur lors de l'import"}
            </h3>

            {results.success && results.summary && (
              <div className="summary">
                <p>
                  <strong>{results.summary.successfulFiles}/{results.summary.totalFiles}</strong> fichier(s)
                  importé(s) avec succès.
                </p>
                {results.allResults.map((fileResult, idx) => (
                  <div key={idx} className="file-result">
                    <strong>{fileResult.fileType}</strong>:{" "}
                    {fileResult.stats.inserted}/{fileResult.stats.total}
                    enregistrements
                  </div>
                ))}
              </div>
            )}

            {!results.success && results.error && (
              <p className="error-message">{results.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Info: All or Nothing */}
      <div className="info-box">
        <h4>⚠️ Policy All or Nothing</h4>
        <p>
          Si une erreur est détectée dans l'import:
          <br />
          <strong>❌ RIEN</strong> ne sera inséré dans la base de données.
          <br />
          Vous devrez corriger les fichiers et réessayer.
        </p>
      </div>
    </div>
  );
}

export default DataImportPage;