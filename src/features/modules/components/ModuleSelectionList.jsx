function ModuleSelectionList({
  modules,
  selectedModules,
  loading,
  allSelected,
  onToggleAll,
  onToggleModule,
}) {
  return (
    <>
      {/* checkbox pour selectionner tout les elements */}
      <div style={{ marginBottom: 12 }}>
        <label>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            disabled={loading}
          />{" "}
          Tout selectionner
        </label>
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 420, overflowY: "auto" }}>
        {modules.map((moduleName) => (
          <li key={moduleName} style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={selectedModules.includes(moduleName)}
                onChange={() => onToggleModule(moduleName)}
                disabled={loading}
              />{" "}
              {moduleName}
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

export default ModuleSelectionList;
