/**
 * FONCTION: ModuleSelectionList
 * ANJARA: Mampiseho lisitra iray misy anarana modules ary misy boaty kely (checkbox) eo anilany.
 *       Ahafahana mifantina modules maromaro indray miaraka.
 */
function ModuleSelectionList({
  modules,
  selectedModules,
  loading,
  allSelected,
  onToggleAll,
  onToggleModule,
}) {
  
  // Ny ampahany hita maso (HTML/JSX) izay avoakan'ity fonction ity.
  return (
    <>
      {/* Fizarana 1: Checkbox an'ny "Tout sélectionner" */}
      <div style={{ marginBottom: 12 }}>
        <label>
          <input
            type="checkbox"
            // Hamarinina raha efa voafantina daholo ny modules rehetra
            checked={allSelected}
            // Rehefa tsindriana ity checkbox ity dia antsoina ny fonction onToggleAll
            onChange={onToggleAll}
            // Tsy azo tsindriana ity checkbox ity raha mbola misy asa mandeha (loading)
            disabled={loading}
          />
          {" "}
          Tout selectionner
        </label>
      </div>

      {/* Fizarana 2: Lisitry ny modules tsirairay */}
      <ul style={{ 
        listStyle: "none",  // Tsy asiana teboka na isa eo alohan'ny lisitra
        padding: 0,         // Tsy asiana sisiny anatiny
        margin: 0,          // Tsy asiana sisiny ivelany
        maxHeight: 420,     // Ny haavony be indrindra dia 420px
        overflowY: "auto"   // Aseho ny "ascenseur" raha mihoatra ny haavony ny lisitra
      }}>
        
        {/* Mamerina mampiseho isaky ny module ao anatin'ny lisitry ny 'modules' */}
        {modules.map((moduleName) => (
          
          // Isaky ny module dia mamboatra an'ity singa 'li' ity
          <li key={moduleName} style={{ marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                // Voamarika (checked) ity raha toa ka ao anatin'ny lisitry ny 'selectedModules' ilay module
                checked={selectedModules.includes(moduleName)}
                // Rehefa tsindriana dia antsoina ny fonction onToggleModule miaraka amin'ny anaran'ilay module
                onChange={() => onToggleModule(moduleName)}
                // Tsy azo tsindriana raha mbola misy asa mandeha (loading)
                disabled={loading}
              />
              {" "}
              {/* Aseho eto ny anaran'ilay module */}
              {moduleName}
            </label>
          </li>
          
        ))}
      </ul>
    </>
  );
}

export default ModuleSelectionList;