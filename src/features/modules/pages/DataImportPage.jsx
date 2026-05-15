/**
 * PAGE IMPORT DE DONNÉES PRESTASHOP
 * Route: /admin/modules/data-import
 *
 * Flux: CSV → Mapping → XML → API PrestaShop
 * Fichier 1: Produits | Fichier 2: Déclinaisons & Stock | Fichier 3: Clients & Commandes
 * Politique: All or Nothing par fichier (si erreur → arrêt immédiat)
 */

import { useState } from "react";
import { runImport } from "../services/importOrchestrator";
import { deleteSelectedModules } from "../services/moduleDeletion.service";
import { ROLLBACK_MODULES_BY_FILE } from "../constants/moduleRegistry";
import "./DataImportPage.css";

// Champs vides — utilisé pour réinitialiser le formulaire
const EMPTY_FILES = {
  fichier1_products: null,
  fichier2_combinations: null,
  fichier3_transactions: null,
  images_zip: null,
};

/**
 * Rollback : supprime les modules qui ont été partiellement insérés.
 * Respecte l'ordre FK : enfants supprimés avant les parents.
 * @param {Array} insertedResults - Résultats avec inserted > 0
 * @param {Function} log - Fonction de log
 */

// =======================Rollback=======================

async function runRollback(insertedResults, log) {
  log("");
  log(" Rollback automatique — suppression des données insérées...");

  // Construire la liste unique des modules à supprimer (ordre FK respecté)
  const modulesToDelete = [];
  for (const result of insertedResults) {
    const modules = ROLLBACK_MODULES_BY_FILE[result.file] || [];
    for (const mod of modules) {
      if (!modulesToDelete.includes(mod)) {
        modulesToDelete.push(mod);
      }
    }
  }

  if (modulesToDelete.length === 0) {
    log("  Tsa misy module voafafa lekaaa");
    return;
  }

  log(`  Module ho diovina : ${modulesToDelete.join(", ")}`);

  // Suppression séquentielle (respecte les FK)
  for (const moduleName of modulesToDelete) {
    try {
      log(`  Suppression ${moduleName}...`);
      const results = await deleteSelectedModules([moduleName]);
      const deleted = results[0]?.deleted ?? 0;
      log(`  ✓ ${moduleName}: ${deleted} enregistrement(s) supprimé(s)`);
    } catch (err) {
      log(`  ⚠️ ${moduleName}: ${err.message}`);
    }
  }

  log(" Rollback terminé");
  log("");
}

// =======================Import=======================

function DataImportPage() {
  const [files, setFiles] = useState({ ...EMPTY_FILES });
  const [importing, setImporting] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState(null);

  const addLog = (msg) => setLogs((prev) => [...prev, msg]);

  const handleFile = (key, file) =>
    setFiles((prev) => ({ ...prev, [key]: file }));

  const hasFiles = Object.values(files).some(Boolean);

  const handleImport = async () => {
    if (!hasFiles) return;

    setImporting(true);
    setLogs([]);
    setResults(null);

    try {
      const allResults = await runImport(files, addLog);
      const hasErrors = allResults.some((r) => r.errors?.length > 0);
      setResults({ success: !hasErrors, allResults });

      // Rollback automatique si erreur + au moins une insertion partielle
      if (hasErrors) {
        const partiallyInserted = allResults.filter((r) => r.inserted > 0);
        if (partiallyInserted.length > 0) {
          await runRollback(partiallyInserted, addLog);
        }
        // Réinitialiser tous les champs d'import
        setFiles({ ...EMPTY_FILES });
        addLog("↺ Champs réinitialisés");
      }
    } catch (err) {
      addLog(`❌ Erreur générale: ${err.message}`);
      setResults({ success: false, error: err.message });
      // Reset aussi en cas d'erreur complète
      setFiles({ ...EMPTY_FILES });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="data-import-page">
      <div className="header">
        <h1> Import de Données PrestaShop</h1>
        <p>
          Importez dans l'ordre : <strong>1. Produits</strong> →{" "}
          <strong>2. Déclinaisons & Stock</strong> →{" "}
          <strong>3. Clients & Commandes</strong>
        </p>
      </div>

      <div className="import-container">
        {/* Sélection des fichiers */}
        <div className="files-section">
          <FileInput
            label=" Fichier 1 — Produits"
            hint="Colonnes: date_availability_produit, nom, reference, prix_ttc, taxe, categorie, prix_achat"
            file={files.fichier1_products}
            onChange={(f) => handleFile("fichier1_products", f)}
            disabled={importing}
          />
          <FileInput
            label=" Fichier 2 — Déclinaisons & Stock"
            hint="Colonnes: reference, specificite, karazany, stock_initial, prix_vente_ttc"
            file={files.fichier2_combinations}
            onChange={(f) => handleFile("fichier2_combinations", f)}
            disabled={importing}
          />
          <FileInput
            label=" Fichier 3 — Clients & Commandes"
            hint="Colonnes: date, nom, email, pwd, adresse, achat, etat"
            file={files.fichier3_transactions}
            onChange={(f) => handleFile("fichier3_transactions", f)}
            disabled={importing}
          />
          <FileInput
            label=" Images (ZIP)"
            hint="Fichier ZIP contenant les images nommées d'après les références : T_01.png, P_01.jpeg..."
            file={files.images_zip}
            onChange={(f) => handleFile("images_zip", f)}
            disabled={importing}
            accept=".zip"
          />
        </div>

        {/* Bouton lancer */}
        <div className="import-controls">
          <button
            onClick={handleImport}
            disabled={importing || !hasFiles}
            className={`btn-import ${importing ? "loading" : ""}`}
          >
            {importing ? " Import en cours..." : " Alefa le import"}
          </button>
        </div>

        {/* Journal en temps réel */}
        {logs.length > 0 && (
          <div className="log-section">
            <h3> Journal d'import</h3>
            <div className="log-viewer">
              {logs.map((entry, idx) => (
                <div
                  key={idx}
                  className={`log-entry ${
                    entry.includes("✓") || entry.includes("✅")
                      ? "success"
                      : entry.includes("✗") || entry.includes("❌")
                        ? "error"
                        : entry.includes("XD")
                          ? "warn"
                          : ""
                  }`}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résultats finaux */}
        {results && <ResultsPanel results={results} />}
      </div>

      <div className="info-box">
        <h4>⚠️ Politique All or Nothing</h4>
        <p>
          Si une erreur est détectée dans un fichier, l'import s'arrête
          immédiatement. Les fichiers suivants ne seront pas traités. Corrigez
          les erreurs et relancez.
        </p>
      </div>
    </div>
  );
}

// Composant upload fichier
function FileInput({ label, hint, file, onChange, disabled, accept = ".csv" }) {
  const inputId = `file-${label}`;
  return (
    <div className="file-upload-section">
      <h3>{label}</h3>
      <p className="description">{hint}</p>
      <div className="file-input-wrapper">
        <input
          type="file"
          accept={accept}
          id={inputId}
          disabled={disabled}
          onChange={(e) => onChange(e.target.files[0] || null)}
        />
        <label htmlFor={inputId} className="file-label">
          {file ? (
            <>
              ✓ Sélectionné : <strong>{file.name}</strong>
            </>
          ) : (
            "Choisir un fichier CSV..."
          )}
        </label>
      </div>
      {file && (
        <button
          onClick={() => onChange(null)}
          className="btn-remove"
          disabled={disabled}
        >
          Retirer
        </button>
      )}
    </div>
  );
}

// =======================affichage résultats=======================

// Composant affichage résultats
function ResultsPanel({ results }) {
  const cls = results.success ? "success" : "error";
  return (
    <div className={`results-section ${cls}`}>
      <h3>
        {results.success ? " Import réussi !" : "❌ Erreur lors de l'import"}
      </h3>

      {results.allResults?.map((r, i) => (
        <div key={i} className="file-result">
          <strong>{r.file}</strong> : {r.inserted}/{r.total} insérés
          {r.errors?.length > 0 && (
            <ul className="error-list">
              {r.errors.map((e, j) => (
                <li key={j}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {results.error && <p className="error-message">{results.error}</p>}
    </div>
  );
}

export default DataImportPage;
