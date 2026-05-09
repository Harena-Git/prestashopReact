import { useMemo, useState } from "react";
import ModuleSelectionList from "../components/ModuleSelectionList";
import DeleteModulesButton from "../components/DeleteModulesButton";
import { MODULE_REGISTRY } from "../constants/moduleRegistry";
import { deleteSelectedModules } from "../services/moduleDeletion.service";
import { areAllModulesSelected, toggleModuleSelection } from "../utils/selection";

function ModuleCleanupPage() {
  // 1. Maka ny anaran'ny modules rehetra ao amin'ny REGISTRY
  const modules = useMemo(() => Object.keys(MODULE_REGISTRY), []);
  
  // 2. State hitahirizana ireo modules nosoratana (checkbox)
  const [selectedModules, setSelectedModules] = useState([]);

  // 3. State hanaraha-maso raha mbola miandry valiny avy amin'ny API (chargement)
  const [loading, setLoading] = useState(false);

  // 4. Manamarina raha voafidy daholo ny modules rehetra
  const allSelected = areAllModulesSelected(selectedModules, modules);

  // 5. Fonction manampy na manala module iray ao anaty lisitra
  const onToggleModule = (moduleName) => {
    const vaovao = toggleModuleSelection(selectedModules, moduleName);
    setSelectedModules(vaovao);
  };

  // 6. Misafidy ny rehetra na manala ny rehetra (Tout sélectionner)
  const onToggleAll = () => {
    if (allSelected) {
      setSelectedModules([]); // Esory daholo
    } else {
      setSelectedModules([...modules]); // Fidiana daholo
    }
  };

  // 7. Fonction famafana ny données (Fanalana ny contenu ao anaty PrestaShop)
  const onDeleteSelected = async () => {
    const fanamafisana = window.confirm(
      `Voulez-vous vraiment supprimer les données de ${selectedModules.length} modules ?`
    );

    if (fanamafisana === false) return; // Mijato raha "Annuler" no tsindrina

    setLoading(true); // Manomboka ny chargement (bloquer bouton)

    try {
      const results = await deleteSelectedModules(selectedModules);

      // Mikarakara ny vokatry ny famafana
      let countSuccess = 0;
      let failed = [];
      let totalDeleted = 0;

      // Loop tsotra hanisana ny vokatra
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.success) {
          countSuccess = countSuccess + 1;
          totalDeleted = totalDeleted + (res.deleted || 0);
        } else {
          failed.push(res);
        }
      }

      // Fanambarana ny vokatra (Alert)
      if (failed.length === 0) {
        alert(`Vita soamantsara! Enregistrements ${totalDeleted} voafafa.`);
        setSelectedModules([]);
      } else {
        // Raha misy erreur ny sasany
        const hafatraErreur = failed.map((f) => `${f.module}: ${f.error}`).join("\n");
        alert(`Nisy erreur vitsivitsy:\n${hafatraErreur}`);
        
        // Tehirizina izay tsy tafa ihany mba hamerenana azy
        setSelectedModules(failed.map((f) => f.module));
      }

    } catch (error) {
      alert("Nisy olana tsy nampoizina: " + error.message);
    } finally {
      setLoading(false); // Atsahatra ny chargement (débloquer bouton)
    }
  };

  return (
    <main style={{ padding: 16 }}>
      <h1>Suppression des données des modules</h1>

      {/* Lisitry ny modules azo isafidianana */}
      <ModuleSelectionList
        modules={modules}
        selectedModules={selectedModules}
        loading={loading}
        allSelected={allSelected}
        onToggleAll={onToggleAll}
        onToggleModule={onToggleModule}
      />

      {/* Bouton hamafana izay voafidy */}
      <DeleteModulesButton
        loading={loading}
        selectedCount={selectedModules.length}
        onDelete={onDeleteSelected}
      />
    </main>
  );
}

export default ModuleCleanupPage;
