function ImportCsvButton({ loading, disabled, onImport }) {
  return (
    <button onClick={onImport} disabled={loading || disabled}>
      {loading ? "Importation..." : "Importer le fichier"}
    </button>
  );
}

export default ImportCsvButton;
